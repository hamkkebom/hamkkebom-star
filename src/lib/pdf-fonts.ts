import { Font } from "@react-pdf/renderer";
import path from "path";

const fontsDir = path.join(process.cwd(), "public", "fonts");

// Register Noto Sans KR static fonts for regular and bold weights
Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: path.join(fontsDir, "NotoSansKR-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontsDir, "NotoSansKR-Bold.ttf"), fontWeight: 700 },
  ],
});

// Prevent Korean text from being split at word boundaries
Font.registerHyphenationCallback((word: string) => [word]);
