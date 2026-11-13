"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Paperclip, Upload, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFiles, deleteAttachment } from "@/server/actions/files";

const sizeLabel = (b: number) =>
  b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} kB`;

export function ProjectFilesTab({
  projectId,
  files,
  canEdit,
}: {
  projectId: string;
  files: { id: string; name: string; mime: string; size: number; createdAt: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(selected).forEach((f) => fd.append("files", f));
      await uploadFiles(projectId, fd);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Nahrání selhalo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#78716C]">{files.length} souborů</p>
        {canEdit && (
          <>
            <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} />
            <Button
              size="sm"
              className="gap-2 btn-glass-primary text-white"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Nahrávám..." : "Nahrát soubory"}
            </Button>
          </>
        )}
      </div>

      <div className="glass rounded-xl divide-y divide-black/5">
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-3 px-5 py-3">
            <Paperclip className="w-4 h-4 text-[#6366F1] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#1C1917] truncate">{f.name}</p>
              <p className="text-xs text-[#78716C]">
                {sizeLabel(f.size)} • {format(new Date(f.createdAt), "d.M.yyyy HH:mm")}
              </p>
            </div>
            <a
              href={`/api/files/${f.id}`}
              className="p-1.5 rounded-lg text-[#6366F1] hover:bg-white/60"
              title="Stáhnout"
            >
              <Download className="w-4 h-4" />
            </a>
            {canEdit && (
              <button
                onClick={async () => {
                  await deleteAttachment(f.id);
                  router.refresh();
                }}
                className="p-1.5 rounded-lg text-[#A8A29E] hover:text-rose-500 hover:bg-white/70"
                title="Smazat soubor"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {files.length === 0 && (
          <p className="px-5 py-10 text-sm text-[#78716C] text-center">
            Zatím žádné soubory. Nahrajte briefy, podklady nebo výstupy (max 4 MB na soubor).
          </p>
        )}
      </div>
    </div>
  );
}
