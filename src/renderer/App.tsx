import { useEffect, useState } from "react";
import type { Bootstrap } from "../shared/api";
import type { ManagedProject } from "../shared/contracts";
import { NewProject } from "./components/new-project";
import { Onboarding } from "./components/onboarding";
import { Workspace } from "./components/workspace";

export function App() {
  const [bootstrap, setBootstrap] = useState<Bootstrap>();
  const [project, setProject] = useState<ManagedProject>();
  useEffect(() => {
    void window.uruvam.bootstrap().then((value) => {
      setBootstrap(value);
      setProject(value.projects[0]);
    });
  }, []);
  if (!bootstrap)
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="brand-mark pulse">U</div>
      </main>
    );
  if (!bootstrap.credentialStored)
    return (
      <Onboarding
        onComplete={() =>
          setBootstrap({
            ...bootstrap,
            credentialStored: true,
            onboarded: true,
          })
        }
      />
    );
  if (!project) return <NewProject onCreated={setProject} />;
  return <Workspace project={project} />;
}
