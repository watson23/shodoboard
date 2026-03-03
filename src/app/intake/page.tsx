"use client";

import { useState } from "react";
import IntakeConversation from "@/components/IntakeConversation";
import {
  Notebook,
  ArrowRight,
  ShieldCheck,
  Camera,
  X,
} from "@phosphor-icons/react";

type ConsentState = null | boolean;

function ConsentScreen({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <ShieldCheck
            size={40}
            weight="duotone"
            className="text-indigo-500 dark:text-indigo-400 mx-auto"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Tietosuoja ja datan käsittely
          </h1>
        </div>

        <div className="space-y-4 text-sm leading-relaxed">
          <div className="space-y-1">
            <p className="text-gray-600 dark:text-gray-300">
              Shodoboard käyttää Anthropicin Claude-tekoälyä backlogisi
              analysointiin.
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs">
              Shodoboard uses Anthropic&apos;s Claude AI to analyze your backlog.
            </p>
          </div>

          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Tietojesi käsittely:
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-gray-600 dark:text-gray-300">
              <li>
                Backlog-tekstisi lähetetään Anthropicin Claude API:lle
                analysoitavaksi
              </li>
              <li>
                Anthropic ei käytä dataasi malliensa kouluttamiseen
              </li>
              <li>Data poistetaan 30 päivän kuluessa</li>
              <li>
                Taulusi data tallennetaan Googlen Firebase-tietokantaan
                (EU-palvelin)
              </li>
            </ul>
            <p className="font-medium text-gray-500 dark:text-gray-400 mt-3 mb-1.5 text-xs">
              How your data is handled:
            </p>
            <ul className="space-y-1 list-disc list-inside text-gray-400 dark:text-gray-500 text-xs">
              <li>Your backlog text is sent to Anthropic&apos;s Claude API for analysis</li>
              <li>Anthropic does not use your data to train its models</li>
              <li>Data is deleted within 30 days</li>
              <li>Your board data is stored in Google Firebase (EU server)</li>
            </ul>
          </div>

          <div className="space-y-1">
            <p className="text-amber-600 dark:text-amber-400 font-medium">
              Suositus: Älä liitä henkilötietoja, asiakkaiden nimiä tai
              liikesalaisuuksia.
            </p>
            <p className="text-amber-500/70 dark:text-amber-400/60 text-xs">
              Recommendation: Don&apos;t include personal data, customer names, or trade secrets.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onAccept}
            className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl px-6 py-3 transition-colors"
          >
            Ymmärrän ja jatkan
            <ArrowRight size={18} weight="bold" />
          </button>
          <button
            onClick={onDecline}
            className="w-full flex items-center justify-center gap-2 border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold rounded-xl px-6 py-3 transition-colors"
          >
            Jatka ilman tekoälyä
          </button>
        </div>
      </div>
    </div>
  );
}

interface ImageData {
  base64: string;
  mediaType: string;
  name: string;
}

function BacklogInput({
  backlog,
  setBacklog,
  goalsInput,
  setGoalsInput,
  images,
  setImages,
  onStart,
}: {
  backlog: string;
  setBacklog: (v: string) => void;
  goalsInput: string;
  setGoalsInput: (v: string) => void;
  images: ImageData[];
  setImages: (v: ImageData[]) => void;
  onStart: () => void;
}) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Extract base64 data and media type from data URL
        const match = result.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (match) {
          setImages([...images, {
            base64: match[2],
            mediaType: match[1],
            name: file.name,
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const hasContent = backlog.trim() || images.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <Notebook
            size={40}
            weight="duotone"
            className="text-indigo-500 dark:text-indigo-400 mx-auto"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            What are you working on?
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Paste your backlog, upload a photo of your task board, or both.
          </p>
        </div>

        <textarea
          value={backlog}
          onChange={(e) => setBacklog(e.target.value)}
          rows={14}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm leading-relaxed px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 resize-none"
          placeholder="Paste your feature list, tasks, or ideas here..."
        />

        {/* Image upload */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors w-fit">
            <Camera size={20} weight="duotone" />
            <span>Add photo or screenshot (Miro, post-its, whiteboard...)</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                >
                  <img
                    src={`data:${img.mediaType};base64,${img.base64}`}
                    alt={img.name}
                    className="h-20 w-20 object-cover"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Business goals or OKRs{" "}
            <span className="text-gray-400 dark:text-gray-500 font-normal">
              (optional)
            </span>
          </label>
          <textarea
            value={goalsInput}
            onChange={(e) => setGoalsInput(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm leading-relaxed px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 resize-none"
            placeholder="If you have existing business goals, OKRs, or outcomes, paste them here..."
          />
        </div>

        <button
          onClick={onStart}
          disabled={!hasContent}
          className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
        >
          Let&apos;s go
          <ArrowRight size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
}

export default function IntakePage() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [started, setStarted] = useState(false);
  const [backlog, setBacklog] = useState("");
  const [goalsInput, setGoalsInput] = useState("");
  const [images, setImages] = useState<ImageData[]>([]);

  // Show consent screen first
  if (consent === null) {
    return (
      <ConsentScreen
        onAccept={() => setConsent(true)}
        onDecline={() => setConsent(false)}
      />
    );
  }

  // After consent, show conversation or backlog input
  if (started) {
    return <IntakeConversation backlog={backlog} goals={goalsInput} images={images} />;
  }

  // Consent declined — show info and allow proceeding without AI
  if (consent === false) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl space-y-6">
          <div className="text-center space-y-2">
            <Notebook
              size={40}
              weight="duotone"
              className="text-indigo-500 dark:text-indigo-400 mx-auto"
            />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Manual mode
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Shodoboard works best with AI analysis, but you can still
              paste your backlog. Items will be placed in the
              &ldquo;Opportunities&rdquo; column for manual sorting.
            </p>
          </div>

          <textarea
            value={backlog}
            onChange={(e) => setBacklog(e.target.value)}
            rows={14}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm leading-relaxed px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 resize-none"
            placeholder="Paste your feature list, tasks, or ideas here..."
          />

          <button
            onClick={() => setStarted(true)}
            disabled={!backlog.trim()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
          >
            Create board
            <ArrowRight size={18} weight="bold" />
          </button>

          <button
            onClick={() => setConsent(null)}
            className="w-full text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            &larr; Go back to enable AI
          </button>
        </div>
      </div>
    );
  }

  // Consent accepted — show backlog input with goals
  return (
    <BacklogInput
      backlog={backlog}
      setBacklog={setBacklog}
      goalsInput={goalsInput}
      setGoalsInput={setGoalsInput}
      images={images}
      setImages={setImages}
      onStart={() => setStarted(true)}
    />
  );
}
