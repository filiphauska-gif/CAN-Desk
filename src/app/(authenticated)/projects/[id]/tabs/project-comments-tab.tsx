"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addComment } from "@/server/actions/comments";
import { Button } from "@/components/ui/button";
import { Send, User } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export function ProjectCommentsTab({
  projectId,
  comments,
}: {
  projectId: string;
  comments: any[];
  userId: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      await addComment(projectId, content.trim());
      setContent("");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* New comment form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#E7E5E4] p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Napsat komentář..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none"
        />
        <div className="flex justify-end mt-3">
          <Button
            type="submit"
            disabled={!content.trim() || sending}
            size="sm"
            className="bg-[#6366F1] hover:bg-[#4F46E5] text-white gap-2"
          >
            <Send className="w-3 h-3" />
            {sending ? "Odesílám..." : "Odeslat"}
          </Button>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-3">
        {comments.map((comment: any) => (
          <div
            key={comment.id}
            className="bg-white rounded-xl border border-[#E7E5E4] p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#F5F5F4] flex items-center justify-center">
                <User className="w-4 h-4 text-[#78716C]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1C1917]">
                  {comment.author.name}
                </p>
                <p className="text-xs text-[#78716C]">
                  {format(new Date(comment.createdAt), "d. MMMM yyyy HH:mm", {
                    locale: cs,
                  })}
                </p>
              </div>
            </div>
            <p className="text-sm text-[#1C1917] whitespace-pre-wrap pl-11">
              {comment.content}
            </p>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="bg-white rounded-xl border border-[#E7E5E4] p-12 text-center">
            <p className="text-[#78716C]">Zatím žádné komentáře</p>
            <p className="text-sm text-[#A8A29E] mt-1">
              Buďte první, kdo napíše komentář k tomuto projektu
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
