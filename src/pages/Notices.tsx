import React from "react";
import { CrudPage } from "../components/CrudPage";
import { Notice } from "../lib/types";
import { Badge } from "../components/ui/badge";

export const Notices: React.FC = () => (
  <CrudPage<Notice>
    title="Notices"
    description="Publish and manage institution-wide academic notices."
    table="notices"
    searchKeys={["title", "message", "audience", "status"]}
    fields={[
      { key: "title", label: "Notice Title", required: true },
      { key: "message", label: "Message", required: true },
      {
        key: "audience",
        label: "Audience",
        type: "select",
        required: true,
        defaultValue: "all",
        options: [
          { value: "all", label: "Everyone" },
          { value: "teachers", label: "Teachers" },
          { value: "students", label: "Students" },
          { value: "parents", label: "Parents" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        required: true,
        defaultValue: "draft",
        options: [
          { value: "published", label: "Published" },
          { value: "draft", label: "Draft" },
        ],
      },
    ]}
    columns={[
      {
        header: "Title",
        render: (n) => <span className="font-semibold">{n.title}</span>,
      },
      { header: "Audience", render: (n) => n.audience },
      {
        header: "Status",
        render: (n) => (
          <Badge variant={n.status === "published" ? "success" : "secondary"}>
            {n.status}
          </Badge>
        ),
      },
      {
        header: "Created",
        render: (n) =>
          n.created_at ? new Date(n.created_at).toLocaleDateString() : "—",
      },
    ]}
  />
);
