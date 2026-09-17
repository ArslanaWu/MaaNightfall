from pathlib import Path

import shutil

assets_dir = Path(__file__).parent.parent.resolve() / "assets"


def configure_ocr_model():
    ocr_dir = assets_dir / "resource" / "model" / "ocr"
    required_files = [ocr_dir / "det.onnx", ocr_dir / "keys.txt", ocr_dir / "rec.onnx"]
    if all(path.exists() for path in required_files):
        print("Found existing OCR model, skipping default OCR model import.")
        return

    assets_ocr_dir = assets_dir / "MaaCommonAssets" / "OCR"
    if not assets_ocr_dir.exists():
        print(f"File Not Found: {assets_ocr_dir}")
        exit(1)

    if not ocr_dir.exists():   # copy default OCR model only if dir does not exist
        shutil.copytree(
            assets_dir / "MaaCommonAssets" / "OCR" / "ppocr_v6" / "small",
            ocr_dir,
            dirs_exist_ok=True,
        )
    else:
        print("Found incomplete OCR directory; please remove it and run configure.py again.")
        exit(1)


if __name__ == "__main__":
    configure_ocr_model()

    print("OCR model configured.")
