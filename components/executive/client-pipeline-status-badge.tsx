import { AdminBadge } from "@/components/admin/admin-data-table";
import {
  CLIENT_PIPELINE_STATUS_LABELS,
  CLIENT_PIPELINE_STATUS_TONES,
} from "@/lib/client-pipeline/constants";
import type { ClientPipelineStatus } from "@/types/client-pipeline";

export function ClientPipelineStatusBadge({
  status,
}: {
  status: ClientPipelineStatus | undefined;
}) {
  const resolved = status ?? "NUEVO";
  return (
    <AdminBadge tone={CLIENT_PIPELINE_STATUS_TONES[resolved]}>
      {CLIENT_PIPELINE_STATUS_LABELS[resolved]}
    </AdminBadge>
  );
}
