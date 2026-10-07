// Browser-only: shrinks a picked photo to a small JPEG data URL, the same way scratch-card gift
// images are stored (components/campaign/RangeWizard.js). Keeps prize images well under the
// server's 200 KB limit.

const MAX_DIMENSION = 480;
const QUALITY = 0.82;

export function compressPrizeImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Choose a JPEG, PNG or WebP picture'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('That picture could not be read. Try another one.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('That picture could not be opened. Try another one.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const context = canvas.getContext('2d');
        // White behind transparent PNGs, so they do not turn black as JPEG.
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', QUALITY));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}
