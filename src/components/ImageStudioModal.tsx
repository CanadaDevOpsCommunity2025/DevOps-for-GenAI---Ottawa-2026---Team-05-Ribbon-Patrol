import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Download,
  Check,
  RefreshCw,
  Upload,
  Layers,
  Palette,
  Camera,
  Bot,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { GeneratedImage } from '../types';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAvatar: (imageUrl: string) => void;
  currentAvatarUrl?: string;
}

const PRESET_PROMPTS = [
  {
    title: 'Cyberpunk Corgi',
    prompt: 'A futuristic cybernetic corgi developer wearing holographic AR glasses and a glowing neon Git badge, vibrant purple and cyan studio lighting, highly detailed digital 3D mascot',
  },
  {
    title: 'Pixel Repo Dragon',
    prompt: 'A cute 16-bit pixel art mini dragon curled up on top of a glowing terminal monitor with clean green Git tree branches, retro game aesthetic, sharp pixels',
  },
  {
    title: 'Astronaut Shiba',
    prompt: 'An adventurous Shiba Inu astronaut holding a wrench fixing a floating satellite with git commit tags orbiting in deep space, warm cosmic illumination',
  },
  {
    title: 'Steampunk DevOps Owl',
    prompt: 'An intelligent steampunk owl wearing brass terminal goggles and a leather tool vest holding a glowing crystal commit hash, intricate clockwork background',
  },
  {
    title: 'Cozy Coffee Cat',
    prompt: 'A cozy calico cat programmer in an oversized knit sweater drinking espresso next to a mechanical keyboard with glowing commit indicators, warm loft lighting',
  },
];

const EDIT_PRESETS = [
  'Add glowing neon cyberpunk glasses and a laser collar',
  'Add a golden crown and celebration confetti for clean merges',
  'Add a red bandanna with git conflict warning symbols',
  'Transform into a retro 90s pixel art style',
  'Add a tiny developer headset and mechanical keyboard in hands',
];

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  onSelectAvatar,
  currentAvatarUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'edit' | 'gallery'>('create');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:3' | '16:9'>('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Tab State
  const [selectedSourceImage, setSelectedSourceImage] = useState<string | null>(
    currentAvatarUrl || null
  );
  const [editPrompt, setEditPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gallery of generated images
  const [gallery, setGallery] = useState<GeneratedImage[]>(() => {
    return [
      {
        id: 'img_default_1',
        prompt: 'Cyberpunk Corgi with holographic AR glasses',
        imageUrl:
          'data:image/svg+xml;utf8,' +
          encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
            <rect width="512" height="512" rx="64" fill="#0F172A"/>
            <circle cx="256" cy="230" r="140" fill="#1E293B" stroke="#06B6D4" stroke-width="6"/>
            <text x="256" y="275" font-size="120" text-anchor="middle">🐕</text>
            <rect x="156" y="390" width="200" height="42" rx="21" fill="#3B82F6"/>
            <text x="256" y="416" font-family="sans-serif" font-size="14" font-weight="bold" fill="#FFF" text-anchor="middle">CYBER-BYTE</text>
          </svg>
        `),
        createdAt: new Date().toLocaleTimeString(),
        aspectRatio: '1:1',
        mode: 'create',
      },
    ];
  });

  const [activeResult, setActiveResult] = useState<GeneratedImage | null>(gallery[0] || null);
  const [appliedAvatar, setAppliedAvatar] = useState<string | null>(currentAvatarUrl || null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
        }),
      });

      const data = await response.json();
      if (data.imageUrl) {
        const newImg: GeneratedImage = {
          id: `img_${Date.now()}`,
          prompt: prompt.trim(),
          imageUrl: data.imageUrl,
          createdAt: new Date().toLocaleTimeString(),
          aspectRatio,
          mode: 'create',
        };
        setGallery((prev) => [newImg, ...prev]);
        setActiveResult(newImg);
        setActiveTab('gallery');
      } else {
        setErrorMsg(data.error || 'Failed to generate image.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error during image generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedSourceImage || !editPrompt.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/images/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editPrompt.trim(),
          imageBase64: selectedSourceImage,
          aspectRatio,
        }),
      });

      const data = await response.json();
      if (data.imageUrl) {
        const newImg: GeneratedImage = {
          id: `img_edit_${Date.now()}`,
          prompt: editPrompt.trim(),
          imageUrl: data.imageUrl,
          createdAt: new Date().toLocaleTimeString(),
          aspectRatio,
          mode: 'edit',
          originalImage: selectedSourceImage,
        };
        setGallery((prev) => [newImg, ...prev]);
        setActiveResult(newImg);
        setActiveTab('gallery');
      } else {
        setErrorMsg(data.error || 'Failed to edit image.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error during image edit.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedSourceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyAvatar = (imgUrl: string) => {
    onSelectAvatar(imgUrl);
    setAppliedAvatar(imgUrl);
  };

  const handleDownload = (imgUrl: string, filename = 'gitpet-avatar.png') => {
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="image-studio-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      >
        <motion.div
          id="image-studio-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans"
        >
          {/* Header */}
          <div
            id="image-studio-header"
            className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-md shadow-rose-500/20 text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-100">Pet Avatar & Image Studio</h2>
                  <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                    gemini-3.1-flash-image
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Generate custom mascot companions or edit existing avatars using natural language prompts.
                </p>
              </div>
            </div>
            <button
              id="image-studio-close-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div
            id="image-studio-tabs"
            className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900/50"
          >
            <button
              id="image-studio-tab-create"
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              Create New Mascot
            </button>
            <button
              id="image-studio-tab-edit"
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                activeTab === 'edit'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Edit Avatar with Prompts
            </button>
            <button
              id="image-studio-tab-gallery"
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                activeTab === 'gallery'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Avatar Gallery ({gallery.length})
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {errorMsg && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center justify-between">
                <span>{errorMsg}</span>
                <button
                  onClick={() => setErrorMsg(null)}
                  className="text-rose-400 hover:text-rose-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* TAB 1: CREATE */}
            {activeTab === 'create' && (
              <div id="image-studio-create-view" className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Mascot Character Prompt
                    </label>
                    <textarea
                      id="image-create-prompt-input"
                      rows={4}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. A friendly cyberpunk Shiba Inu wearing a glowing commit badge, high quality 3D digital art..."
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
                    />
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      Aspect Ratio
                    </label>
                    <div className="flex gap-2">
                      {(['1:1', '4:3', '16:9'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setAspectRatio(ratio)}
                          className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
                            aspectRatio === ratio
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {ratio} {ratio === '1:1' ? '(Square Avatar)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preset Suggestions */}
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 mb-2">
                      Developer Companion Presets
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_PROMPTS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPrompt(p.prompt)}
                          className="px-2.5 py-1 text-xs bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 rounded-lg transition-colors text-left"
                        >
                          ✨ {p.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    id="image-generate-btn"
                    disabled={isGenerating || !prompt.trim()}
                    onClick={handleGenerate}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating Pet Artwork with Gemini...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Generate Custom Pet Mascot
                      </>
                    )}
                  </button>
                </div>

                {/* Preview / Current Active */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                  {activeResult ? (
                    <div className="space-y-3 w-full text-center">
                      <div className="relative mx-auto w-56 h-56 rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-xl bg-slate-900 group">
                        <img
                          src={activeResult.imageUrl}
                          alt="Pet Avatar"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        {appliedAvatar === activeResult.imageUrl && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center gap-1 shadow-md">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-xs mx-auto">
                        "{activeResult.prompt}"
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button
                          id="apply-avatar-create-btn"
                          onClick={() => handleApplyAvatar(activeResult.imageUrl)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Set as Pet Avatar
                        </button>
                        <button
                          onClick={() => handleDownload(activeResult.imageUrl)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
                          title="Download Image"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 space-y-2 text-slate-500">
                      <Bot className="w-12 h-12 mx-auto text-slate-600" />
                      <p className="text-xs">Enter a prompt and click Generate to see your pet!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: EDIT */}
            {activeTab === 'edit' && (
              <div id="image-studio-edit-view" className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-4">
                  {/* Select Base Image */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      1. Select Base Mascot Image
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl border border-slate-700 bg-slate-950 overflow-hidden flex items-center justify-center">
                        {selectedSourceImage ? (
                          <img
                            src={selectedSourceImage}
                            alt="Selected Source"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Camera className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload Custom Image
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <p className="text-[11px] text-slate-500">
                          Or select one from your gallery below.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Edit Prompt */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      2. Natural Language Edit Instruction
                    </label>
                    <textarea
                      id="image-edit-prompt-input"
                      rows={3}
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="e.g. Add glowing emerald neon glasses and a gold Git medal around the neck..."
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-sans"
                    />
                  </div>

                  {/* Preset Edits */}
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 mb-2">
                      Quick Modification Presets
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {EDIT_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setEditPrompt(p)}
                          className="px-2.5 py-1 text-xs bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 rounded-lg transition-colors text-left"
                        >
                          🎨 {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    id="image-edit-apply-btn"
                    disabled={isGenerating || !selectedSourceImage || !editPrompt.trim()}
                    onClick={handleEdit}
                    className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Applying AI Edits with gemini-3.1-flash-image...
                      </>
                    ) : (
                      <>
                        <Palette className="w-4 h-4" />
                        Apply Edits to Mascot
                      </>
                    )}
                  </button>
                </div>

                {/* Compare / Preview */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                  {activeResult ? (
                    <div className="space-y-3 w-full text-center">
                      <div className="relative mx-auto w-56 h-56 rounded-2xl overflow-hidden border-2 border-rose-500/40 shadow-xl bg-slate-900 group">
                        <img
                          src={activeResult.imageUrl}
                          alt="Edited Result"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-xs mx-auto">
                        "{activeResult.prompt}"
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button
                          id="apply-avatar-edit-btn"
                          onClick={() => handleApplyAvatar(activeResult.imageUrl)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Set as Pet Avatar
                        </button>
                        <button
                          onClick={() => handleDownload(activeResult.imageUrl)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 space-y-2 text-slate-500">
                      <Layers className="w-12 h-12 mx-auto text-slate-600" />
                      <p className="text-xs">
                        Select a base image and enter edits to produce variations!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: GALLERY */}
            {activeTab === 'gallery' && (
              <div id="image-studio-gallery-view" className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {gallery.map((item) => {
                    const isSelected = activeResult?.id === item.id;
                    const isActiveAvatar = appliedAvatar === item.imageUrl;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setActiveResult(item);
                          setSelectedSourceImage(item.imageUrl);
                        }}
                        className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all bg-slate-950 ${
                          isSelected
                            ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-[1.02]'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="aspect-square w-full">
                          <img
                            src={item.imageUrl}
                            alt={item.prompt}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {isActiveAvatar && (
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-500 text-slate-950 font-bold text-[9px] rounded-md flex items-center gap-0.5 shadow-md">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Avatar
                          </div>
                        )}
                        <div className="p-2 bg-slate-900/90 text-left">
                          <p className="text-[11px] font-medium text-slate-200 truncate">
                            {item.prompt}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                            <span>{item.mode === 'edit' ? 'Edited' : 'Generated'}</span>
                            <span>{item.createdAt}</span>
                          </div>
                        </div>

                        {/* Hover action overlay */}
                        <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyAvatar(item.imageUrl);
                            }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold rounded flex items-center gap-1 shadow"
                          >
                            <Check className="w-3 h-3" /> Set Avatar
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(item.imageUrl);
                            }}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Status */}
          <div
            id="image-studio-footer"
            className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Images generated are saved to your session gallery and ready for mascot skinning.</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
