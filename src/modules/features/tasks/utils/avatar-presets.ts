export const TASK_PACK_AVATARS = [
  "/avatar%20task%20pack/Frame%2010.png",
  "/avatar%20task%20pack/Frame%2011.png",
  "/avatar%20task%20pack/Frame%2012.png",
  "/avatar%20task%20pack/Frame%2013.png",
  "/avatar%20task%20pack/Frame%2014.png",
  "/avatar%20task%20pack/Frame%2015.png",
  "/avatar%20task%20pack/Frame%2016.png",
  "/avatar%20task%20pack/Frame%2017.png",
  "/avatar%20task%20pack/Frame%2018.png",
  "/avatar%20task%20pack/Frame%2019.png",
  "/avatar%20task%20pack/Frame%2020.png",
  "/avatar%20task%20pack/Frame%2023.png",
  "/avatar%20task%20pack/Frame%2024.png",
  "/avatar%20task%20pack/Frame%2025.png",
  "/avatar%20task%20pack/Frame%2026.png",
  "/avatar%20task%20pack/Frame%2027.png",
  "/avatar%20task%20pack/Frame%2028.png",
  "/avatar%20task%20pack/Frame%2029.png",
]

/**
 * Return the collaborator's avatar or a deterministic 3D avatar from the task pack
 */
export function getCollaboratorAvatar(
  photoUrl?: string | null,
  fallbackSeed?: string
): string {
  if (photoUrl && photoUrl.trim() !== "") {
    return photoUrl
  }
  const seed = fallbackSeed || "user"
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % TASK_PACK_AVATARS.length
  return TASK_PACK_AVATARS[index]
}
