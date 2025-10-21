"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, Download, X, ImageIcon, FileImage } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import heic2any from "heic2any"
import JSZip from "jszip"

interface ConvertedFile {
  id: string
  originalName: string
  newName: string
  blob: Blob
  preview: string
  status: "converting" | "ready" | "error"
  progress: number
  format: "jpeg" | "png"
}

export function HeicConverter() {
  const [files, setFiles] = useState<ConvertedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showBatchDownload, setShowBatchDownload] = useState(false)
  const [zipFilename, setZipFilename] = useState("converted-images")
  const [outputFormat, setOutputFormat] = useState<"jpeg" | "png">("jpeg")

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFiles = async (fileList: FileList) => {
    const heicFiles = Array.from(fileList).filter(
      (file) =>
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif"),
    )

    for (const file of heicFiles) {
      const id = Math.random().toString(36).substring(7)
      const originalName = file.name.replace(/\.(heic|heif)$/i, "")

      setFiles((prev) => [
        ...prev,
        {
          id,
          originalName,
          newName: originalName,
          blob: new Blob(),
          preview: "",
          status: "converting",
          progress: 0,
          format: outputFormat,
        },
      ])

      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: outputFormat === "jpeg" ? "image/jpeg" : "image/png",
          quality: outputFormat === "jpeg" ? 0.9 : 1,
        })

        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob
        const preview = URL.createObjectURL(blob)

        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, blob, preview, status: "ready", progress: 100 } : f)))
      } catch (error) {
        console.error("Conversion error:", error)
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "error", progress: 0 } : f)))
      }
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const fileList = e.dataTransfer.files
    await processFiles(fileList)
  }, [])

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files)
    }
  }

  const handleDownload = (file: ConvertedFile) => {
    const url = URL.createObjectURL(file.blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${file.newName}.${file.format === "jpeg" ? "jpg" : "png"}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadAll = () => {
    const readyFiles = files.filter((f) => f.status === "ready")
    if (readyFiles.length === 0) return

    const today = new Date().toISOString().split("T")[0].replace(/-/g, "")
    setZipFilename(`converted-images-${today}`)
    setShowBatchDownload(true)
  }

  const applyBatchDownload = async () => {
    const readyFiles = files.filter((f) => f.status === "ready")
    if (readyFiles.length === 0) return

    const zip = new JSZip()

    readyFiles.forEach((file) => {
      const extension = file.format === "jpeg" ? "jpg" : "png"
      zip.file(`${file.newName}.${extension}`, file.blob)
    })

    const zipBlob = await zip.generateAsync({ type: "blob" })

    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${zipFilename}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setShowBatchDownload(false)
  }

  const handleRemove = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  const handleNameChange = (id: string, newName: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, newName } : f)))
  }

  const readyCount = files.filter((f) => f.status === "ready").length

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl bg-yellow-400 min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-3 text-balance text-gray-900">HEIC画像変換ツール</h1>
        <p className="text-gray-700 text-lg">iPhoneから送られたHEICファイルをJPEGまたはPNGに変換してダウンロード</p>
      </div>

      <Card className="p-8 mb-6 bg-blue-900 text-white border-0 shadow-lg">
        <div className="mb-6">
          <Label className="text-base font-semibold mb-3 block text-white">変換形式</Label>
          <RadioGroup
            value={outputFormat}
            onValueChange={(value) => setOutputFormat(value as "jpeg" | "png")}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="jpeg" id="jpeg" />
              <Label htmlFor="jpeg" className="cursor-pointer font-normal text-white">
                JPEG（ファイルサイズ小）
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="png" id="png" />
              <Label htmlFor="png" className="cursor-pointer font-normal text-white">
                PNG（高品質）
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging ? "border-white bg-white/10" : "border-blue-300 hover:border-white"
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-white/20 p-4">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-lg font-medium mb-1 text-white">HEICファイルをドラッグ&ドロップ</p>
              <p className="text-sm text-blue-100">または、クリックしてファイルを選択</p>
            </div>
            <Input
              type="file"
              accept=".heic,.heif,image/heic,image/heif"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            <Button asChild variant="secondary" size="lg">
              <label htmlFor="file-input" className="cursor-pointer">
                <FileImage className="w-4 h-4 mr-2" />
                ファイルを選択
              </label>
            </Button>
          </div>
        </div>
      </Card>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">
              変換済みファイル ({readyCount}/{files.length})
            </h2>
            {readyCount > 0 && (
              <Button onClick={handleDownloadAll} size="lg">
                <Download className="w-4 h-4 mr-2" />
                すべてダウンロード ({readyCount})
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {files.map((file) => (
              <Card key={file.id} className="p-4 bg-blue-900 text-white border-0 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-lg bg-blue-950 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {file.preview ? (
                      <img
                        src={file.preview || "/placeholder.svg"}
                        alt={file.newName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-blue-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <Label htmlFor={`name-${file.id}`} className="text-sm mb-1.5 block text-white">
                          ファイル名
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`name-${file.id}`}
                            value={file.newName}
                            onChange={(e) => handleNameChange(file.id, e.target.value)}
                            disabled={file.status !== "ready"}
                            className="flex-1 bg-white text-gray-900"
                          />
                          <span className="text-sm text-blue-100">.{file.format === "jpeg" ? "jpg" : "png"}</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(file.id)}
                        className="flex-shrink-0 hover:bg-blue-700 text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {file.status === "converting" && (
                      <div className="space-y-2">
                        <Progress value={file.progress} className="h-2" />
                        <p className="text-sm text-blue-100">変換中...</p>
                      </div>
                    )}

                    {file.status === "ready" && (
                      <Button
                        onClick={() => handleDownload(file)}
                        className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        ダウンロード
                      </Button>
                    )}

                    {file.status === "error" && (
                      <p className="text-sm text-red-200">変換に失敗しました。もう一度お試しください。</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showBatchDownload} onOpenChange={setShowBatchDownload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>一括ダウンロード</DialogTitle>
            <DialogDescription>{readyCount}件のファイルをZIPファイルにまとめてダウンロードします</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="zip-filename" className="text-sm mb-2 block">
              ZIPファイル名
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="zip-filename"
                value={zipFilename}
                onChange={(e) => setZipFilename(e.target.value)}
                placeholder="ファイル名を入力"
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">.zip</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              含まれるファイル:{" "}
              {files
                .filter((f) => f.status === "ready")
                .map((f) => f.newName)
                .join(", ")}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDownload(false)}>
              キャンセル
            </Button>
            <Button onClick={applyBatchDownload}>
              <Download className="w-4 h-4 mr-2" />
              ダウンロード
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
