"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-full rounded-lg" />,
});

interface YamlEditorProps {
  brandConfig: string;
  courseContent: string;
  onBrandConfigChange: (value: string) => void;
  onCourseContentChange: (value: string) => void;
}

export function YamlEditor({
  brandConfig,
  courseContent,
  onBrandConfigChange,
  onCourseContentChange,
}: YamlEditorProps) {
  const [activeTab, setActiveTab] = useState("brand");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="brand">Brand Config</TabsTrigger>
        <TabsTrigger value="course">Course Content</TabsTrigger>
      </TabsList>

      <TabsContent value="brand" className="mt-4">
        <div className="overflow-hidden rounded-lg border border-border">
          <MonacoEditor
            height="500px"
            language="yaml"
            theme="vs-dark"
            value={brandConfig}
            onChange={(v) => onBrandConfigChange(v ?? "")}
            options={{
              minimap: { enabled: false },
              wordWrap: "on",
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </div>
      </TabsContent>

      <TabsContent value="course" className="mt-4">
        <div className="overflow-hidden rounded-lg border border-border">
          <MonacoEditor
            height="500px"
            language="yaml"
            theme="vs-dark"
            value={courseContent}
            onChange={(v) => onCourseContentChange(v ?? "")}
            options={{
              minimap: { enabled: false },
              wordWrap: "on",
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
