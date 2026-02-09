import { ref } from 'vue'

interface CameraState {
    isActive: boolean
    hasPermission: boolean | null
    error: string | null
}

export function useCamera() {
    const state = ref<CameraState>({
        isActive: false,
        hasPermission: null,
        error: null
    })

    const videoRef = ref<HTMLVideoElement | null>(null)
    const canvasRef = ref<HTMLCanvasElement | null>(null)
    let stream: MediaStream | null = null

    const checkCameraSupport = (): boolean => {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    }

    const startCamera = async (): Promise<boolean> => {
        if (!checkCameraSupport()) {
            state.value.error = 'Camera not supported on this device'
            state.value.hasPermission = false
            return false
        }

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            })

            if (videoRef.value) {
                videoRef.value.srcObject = stream
                await videoRef.value.play()
            }

            state.value.isActive = true
            state.value.hasPermission = true
            state.value.error = null
            return true
        } catch (err) {
            const error = err as Error
            state.value.hasPermission = false

            if (error.name === 'NotAllowedError') {
                state.value.error = 'Camera permission denied'
            } else if (error.name === 'NotFoundError') {
                state.value.error = 'No camera found on this device'
            } else {
                state.value.error = `Camera error: ${error.message}`
            }

            return false
        }
    }

    const stopCamera = (): void => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            stream = null
        }

        if (videoRef.value) {
            videoRef.value.srcObject = null
        }

        state.value.isActive = false
    }

    const captureImage = async (): Promise<string | null> => {
        if (!videoRef.value || !canvasRef.value) {
            return null
        }

        const video = videoRef.value
        const canvas = canvasRef.value
        const ctx = canvas.getContext('2d')

        if (!ctx) return null

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)

        return canvas.toDataURL('image/webp', 0.8)
    }

    const captureImageAsBlob = async (): Promise<Blob | null> => {
        if (!videoRef.value || !canvasRef.value) {
            return null
        }

        const video = videoRef.value
        const canvas = canvasRef.value
        const ctx = canvas.getContext('2d')

        if (!ctx) return null

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => resolve(blob),
                'image/webp',
                0.8
            )
        })
    }

    return {
        state,
        videoRef,
        canvasRef,
        checkCameraSupport,
        startCamera,
        stopCamera,
        captureImage,
        captureImageAsBlob
    }
}
