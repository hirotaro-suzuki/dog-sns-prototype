export type CapturedPhoto = {
  id: string;
  blob: Blob;
  objectUrl: string;
  createdAt: number;
};

export function createCapturedPhoto(blob: Blob): CapturedPhoto {
  return {
    id: crypto.randomUUID(),
    blob,
    objectUrl: URL.createObjectURL(blob),
    createdAt: Date.now(),
  };
}

export function releaseCapturedPhoto(photo: CapturedPhoto) {
  URL.revokeObjectURL(photo.objectUrl);
}

export function releaseCapturedPhotos(photos: CapturedPhoto[]) {
  photos.forEach(releaseCapturedPhoto);
}
