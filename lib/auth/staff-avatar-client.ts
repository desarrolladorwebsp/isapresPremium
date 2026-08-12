export async function uploadStaffAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/executive/profile/avatar", {
    method: "POST",
    body: formData,
  });
  const data = (await response.json()) as {
    error?: string;
    avatarUrl?: string;
  };
  if (!response.ok || !data.avatarUrl) {
    throw new Error(data.error ?? "No se pudo subir la foto.");
  }
  return data.avatarUrl;
}

export async function removeStaffAvatar(): Promise<void> {
  const response = await fetch("/api/executive/profile/avatar", {
    method: "DELETE",
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo quitar la foto.");
  }
}

export function withAvatarCacheBust(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}
