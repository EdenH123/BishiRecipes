'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface ImageCropperProps {
  imageFile: File
  onCrop: (croppedBlob: Blob) => void
  onCancel: () => void
  aspectRatio?: number
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      { unit: '%', width: 90 },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  )
}

export default function ImageCropper({
  imageFile,
  onCrop,
  onCancel,
  aspectRatio = 4 / 3,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [imageSrc, setImageSrc] = useState<string>('')
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(imageFile)
    setImageSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth: width, naturalHeight: height } = e.currentTarget
      const initialCrop = centerAspectCrop(width, height, aspectRatio)
      setCrop(initialCrop)
    },
    [aspectRatio]
  )

  async function handleCrop() {
    const image = imgRef.current
    if (!image || !completedCrop) return

    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = completedCrop.width * scaleX
    canvas.height = completedCrop.height * scaleY

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )

    canvas.toBlob(
      (blob) => {
        if (blob) onCrop(blob)
      },
      'image/jpeg',
      0.92
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 text-center">
            חיתוך תמונה
          </h2>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-0">
          {imageSrc && (
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              className="max-h-[60vh]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="תמונה לחיתוך"
                onLoad={onImageLoad}
                className="max-h-[60vh] w-auto"
              />
            </ReactCrop>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={handleCrop}
            disabled={!completedCrop}
            className="flex-1 py-2.5 rounded-lg bg-primary text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            חיתוך
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}
