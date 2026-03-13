import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import CreateProjectForm from "@/components/CreateProjectForm";
import { createProject } from "@/services/database";
import { useAuth } from "@/hooks/use-auth";

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const { session, updateProfile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header
        onNavigate={(target) => navigate(target === "dashboard" ? "/hub" : "/create")}
        onSearchChange={() => undefined}
      />
      <main className="mx-auto max-w-5xl px-4 pt-40 pb-6">
        <CreateProjectForm
          onBack={() => navigate("/hub")}
          onSubmit={async (input) => {
            const created = await createProject(input);
            if (!created) {
              toast.error("Unable to submit innovation", {
                description: "Please try again after confirming your session.",
              });
              return;
            }

            const current = session?.user.innovationsCount ?? 0;
            updateProfile({ innovationsCount: current + 1 });

            toast.success("Innovation submitted successfully", {
              description: "Project moved to submitted state and sent for approval workflow.",
            });
            navigate("/hub");
          }}
        />
      </main>
    </div>
  );
};

export default CreateProjectPage;
