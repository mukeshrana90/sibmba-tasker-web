import { toast } from "react-toastify";
import { MAX_UPLOAD_BYTES, getUploadLimitMb, keepAllowedFiles, setUploadLimitMb, uploadFileError } from "./uploadLimits";

jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));

const file = (name, size = 1000, type = "") => ({ name, size, type });

test("images (incl. iPhone HEIC), PDF and Word files up to 10 MB pass", () => {
  for (const n of ["a.jpg", "IMG_0006.HEIC", "a.heif", "a.png", "a.pdf", "a.doc", "a.docx"]) {
    expect(uploadFileError(file(n, MAX_UPLOAD_BYTES))).toBeNull();
  }
  expect(uploadFileError(file("blob", 10, "image/jpeg"))).toBeNull();
});

test("over 10 MB or another type is refused", () => {
  expect(uploadFileError(file("big.jpg", MAX_UPLOAD_BYTES + 1))).toMatch(/larger than 10 MB/);
  expect(uploadFileError(file("big.pdf", MAX_UPLOAD_BYTES + 1))).toMatch(/larger than 10 MB/);
  expect(uploadFileError(file("tool.exe"))).toMatch(/only images, PDF or Word/);
  expect(uploadFileError(file("blob", 10, "application/zip"))).toMatch(/only images, PDF or Word/);
});

test("keepAllowedFiles drops refused files with a toast", () => {
  const kept = keepAllowedFiles([file("a.jpg"), file("b.zip"), file("c.pdf", MAX_UPLOAD_BYTES + 5)]);
  expect(kept.map((f) => f.name)).toEqual(["a.jpg"]);
  expect(toast.error).toHaveBeenCalledTimes(2);
});

test("photo pickers (imagesOnly) refuse PDF and Word", () => {
  expect(uploadFileError(file("a.pdf"), { imagesOnly: true })).toMatch(/photos must be images/);
  expect(uploadFileError(file("a.docx"), { imagesOnly: true })).toMatch(/photos must be images/);
  expect(uploadFileError(file("IMG_0006.HEIC"), { imagesOnly: true })).toBeNull();
  expect(uploadFileError(file("big.heic", MAX_UPLOAD_BYTES + 1), { imagesOnly: true })).toMatch(/larger than 10 MB/);
});

test("limit follows the server (config.upload.max_file_mb)", () => {
  const MB = 1024 * 1024;
  setUploadLimitMb(5);
  expect(getUploadLimitMb()).toBe(5);
  expect(uploadFileError(file("a.jpg", 6 * MB))).toMatch(/larger than 5 MB/);
  expect(uploadFileError(file("a.pdf", 5 * MB))).toBeNull();
  for (const bad of [0, -1, "abc", null, undefined]) setUploadLimitMb(bad);
  expect(getUploadLimitMb()).toBe(5); // invalid values keep the last good limit
  setUploadLimitMb(12.5);
  expect(uploadFileError(file("a.pdf", 12 * MB))).toBeNull();
  setUploadLimitMb(10);
});
