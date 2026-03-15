import { useState } from "react";
import { Project, APPROVAL_RANKS } from "@/data/mockData";
import { Button as UIButton } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, XCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { updateProjectStatus } from "@/services/database";
import { toast } from "sonner";

interface ProjectApprovalProps {
    project: Project;
    onStatusUpdated: (updatedProject: Project) => void;
}

const ProjectApproval = ({ project, onStatusUpdated }: ProjectApprovalProps) => {
    const { session } = useAuth();
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Only allow DGP, ADGP, IG, DIG
    const userRank = session?.user.rank || "";
    const canApprove = (APPROVAL_RANKS as readonly string[]).includes(userRank);

    // Hide if user can't approve, or project is already approved/rejected
    if (!canApprove) return null;
    if (project.status === "approved" || project.status === "rejected") return null;

    const handleAction = async (status: Project["status"]) => {
        if (!comment.trim()) {
            toast.error("Please provide a comment for this action.");
            return;
        }

        setIsSubmitting(true);
        try {
            const updated = await updateProjectStatus(project.id, { status, comment });
            if (updated) {
                toast.success(`Project has been marked as ${status.replace("_", " ")}`);
                onStatusUpdated(updated);
                setComment("");
            } else {
                toast.error("Failed to update project status.");
            }
        } catch (error) {
            toast.error("An error occurred while updating status.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="rounded-xl border-2 border-primary/20 bg-background p-6 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground font-display">Command Approval Section</h2>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-sm font-semibold mb-2 block">Approver's Remarks</label>
                    <Textarea
                        placeholder="Write your decision remarks here..."
                        className="min-h-[100px] bg-muted/30 focus:bg-background transition-all"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                    <UIButton
                        onClick={() => handleAction("approved")}
                        disabled={isSubmitting}
                        className="bg-success hover:bg-success/90 text-white font-bold px-6 gap-2"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve Project
                    </UIButton>

                    <UIButton
                        variant="outline"
                        onClick={() => handleAction("under_review")}
                        disabled={isSubmitting}
                        className="border-warning text-warning hover:bg-warning/10 font-bold px-6 gap-2"
                    >
                        <Clock className="h-4 w-4" />
                        Mark Under Review
                    </UIButton>

                    <UIButton
                        variant="outline"
                        onClick={() => handleAction("rejected")}
                        disabled={isSubmitting}
                        className="border-destructive text-destructive hover:bg-destructive/10 font-bold px-6 gap-2"
                    >
                        <XCircle className="h-4 w-4" />
                        Reject Project
                    </UIButton>
                </div>

                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-2">
                    AUTHORIZED ACCESS ONLY: {userRank} RANK REQUIRED
                </p>
            </div>
        </div>
    );
};

export default ProjectApproval;
