import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'
import { isAdminRequest } from '@/lib/admin-auth-server'
import { saveEventImage } from '@/lib/image-upload'

export async function POST(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No file provided' }, { status: 400 })
    }

    const publicUrl = await saveEventImage(file)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { url: publicUrl }
    })
  } catch (error: any) {
    console.error('Image upload error:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 400 })
  }
}
