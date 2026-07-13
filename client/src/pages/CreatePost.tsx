import { useState } from 'react';
import { Button, Card } from '../components/ui';
import { aiApi, mediaApi } from '../api';

export default function CreatePost() {
  const [captionInput, setCaptionInput] = useState('');
  const [caption, setCaption] = useState('');
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionError, setCaptionError] = useState('');

  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleGenerateCaption = async () => {
    if (!captionInput.trim()) return;
    setCaptionLoading(true);
    setCaptionError('');
    try {
      const { data } = await aiApi.generateCaption(captionInput);
      setCaption(data.caption);
    } catch {
      setCaptionError('Failed to generate caption');
    } finally {
      setCaptionLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setImageLoading(true);
    setImageError('');
    try {
      const { data } = await aiApi.generateImage(imagePrompt);
      setGeneratedImageUrl(data.imageUrl);
    } catch {
      setImageError('Failed to generate image');
    } finally {
      setImageLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadedUrl('');
    setUploadError('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadLoading(true);
    setUploadError('');
    try {
      const { data } = await mediaApi.upload(selectedFile);
      setUploadedUrl(data.url);
    } catch {
      setUploadError('Failed to upload image');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleRemoveUpload = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setUploadedUrl('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h2 className="text-2xl font-semibold text-gray-900">Create Post</h2>

      {/* Caption Generator */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          AI Caption Generator
        </h3>
        <div className="space-y-3">
          <textarea
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            rows={2}
            placeholder="Describe your post topic..."
            value={captionInput}
            onChange={(e) => setCaptionInput(e.target.value)}
          />
          <Button onClick={handleGenerateCaption} isLoading={captionLoading}>
            Generate Caption
          </Button>
          {captionError && (
            <p className="text-sm text-red-600">{captionError}</p>
          )}
          {caption && (
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-800">{caption}</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => navigator.clipboard.writeText(caption)}
              >
                Copy Caption
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* AI Image Generation */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          AI Image Generation
        </h3>
        <div className="space-y-3">
          <input
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Describe the image you want..."
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
          />
          <Button onClick={handleGenerateImage} isLoading={imageLoading}>
            Generate Image
          </Button>
          {imageError && (
            <p className="text-sm text-red-600">{imageError}</p>
          )}
          {generatedImageUrl && (
            <div className="space-y-2">
              <img
                src={generatedImageUrl}
                alt="Generated"
                className="max-h-64 rounded-lg object-cover"
              />
              <Button
                variant="outline"
                onClick={() => setUploadedUrl(generatedImageUrl)}
              >
                Use This Image
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Media Upload */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Upload Image
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 hover:border-gray-400">
              {selectedFile ? selectedFile.name : 'Click to upload or drag & drop'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>
          {previewUrl && (
            <div className="space-y-2">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-48 rounded-lg object-cover"
              />
              <div className="flex gap-2">
                <Button onClick={handleUpload} isLoading={uploadLoading}>
                  Upload to Cloudinary
                </Button>
                <Button variant="outline" onClick={handleRemoveUpload}>
                  Remove
                </Button>
              </div>
            </div>
          )}
          {uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}
          {uploadedUrl && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <p>Uploaded successfully!</p>
              <p className="mt-1 break-all font-mono text-xs">{uploadedUrl}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}