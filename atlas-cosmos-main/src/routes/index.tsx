import { createFileRoute } from "@tanstack/react-router";
import { AtlasShell } from "@/components/AtlasShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ATLAS — Explore the architecture of the digital world" },
      { name: "description", content: "An adaptive, AI-native ecosystem explorer that visualizes developer concepts as a living knowledge galaxy." },
    ],
  }),
  component: () => <AtlasShell />,
});
