import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import ProjectDetail from "@/components/ProjectDetail";
import ProjectDiscussion from "@/components/ProjectDiscussion";
import ProjectApproval from "@/components/ProjectApproval";
import type { DiscussionComment, Project } from "@/data/mockData";
import { createComment, subscribeProjectComments } from "@/services/realtime";
import { subscribeProjectById } from "@/services/database";
import { socketService } from "@/services/socket";

const ProjectPage = () => {
  const params = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<DiscussionComment[]>([]);

  const projectId = useMemo(() => params.projectId ?? "", [params.projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const unsubscribe = subscribeProjectById(projectId, (result) => {
      setProject(result);
    });

    return unsubscribe;
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const socket = socketService.getSocket();
    socketService.joinProject(projectId);

    const onNewComment = (comment: DiscussionComment) => {
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
    };

    socket?.on("comment-created", onNewComment);

    return () => {
      socket?.off("comment-created", onNewComment);
      socketService.leaveProject(projectId);
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    return subscribeProjectComments(projectId, (items) => {
      setComments(items);
    });
  }, [projectId]);

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          onNavigate={(target) => navigate(target === "dashboard" ? "/hub" : "/create")}
          onSearchChange={() => undefined}
        />
        <div className="mx-auto max-w-5xl px-4 pt-40 pb-10">
          <div className="rounded-xl border border-border bg-card px-6 py-8 text-center text-muted-foreground">
            Project not found.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        onNavigate={(target) => navigate(target === "dashboard" ? "/hub" : "/create")}
        onSearchChange={() => undefined}
      />
      <main className="mx-auto max-w-5xl px-4 pt-44 pb-6 space-y-6">
        <ProjectDetail project={project} onBack={() => navigate("/hub")} />

        <ProjectApproval
          project={project}
          onStatusUpdated={(updated) => setProject(updated)}
        />

        <ProjectDiscussion
          comments={comments}
          onCreateComment={async (content, parentId) => {
            const result = await createComment({ projectId, content, parentId });
            if (result) {
              setComments((current) => [...current, result]);
            }
          }}
        />
      </main>
    </div>
  );
};

export default ProjectPage;
