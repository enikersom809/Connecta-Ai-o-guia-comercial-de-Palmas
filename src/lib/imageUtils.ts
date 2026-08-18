export const compressImage = (file: File, maxWidth = 800, quality = 0.65): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        resolve('');
        return;
      }
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } else {
          resolve(result);
        }
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};
