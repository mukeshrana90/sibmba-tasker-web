const fs = require("fs");
const path = require("path");

const EDIT_TASK = path.join(__dirname, "../Pages/EditTask.js");

describe("EditTask marketing shell", () => {
  let source;

  beforeAll(() => {
    source = fs.readFileSync(EDIT_TASK, "utf8");
  });

  test("uses marketing footer like Post Task", () => {
    expect(source).toMatch(/footerVariant=["']marketing["']/);
  });

  test("uses simba post-task page shell classes", () => {
    expect(source).toMatch(/simba-page p-posttask/);
    expect(source).not.toMatch(/breadcrumb-nav/);
    expect(source).not.toMatch(/post-task-form/);
  });

  test("uses booking location picker instead of inline AddressAutocomplete", () => {
    expect(source).toMatch(/BookingLocationPickerModal/);
    expect(source).toMatch(/bk-location/);
    expect(source).not.toMatch(/AddressAutocomplete/);
  });

  test("still submits update via updatePost with task_id", () => {
    expect(source).toMatch(/CustomerActions\.updatePost/);
    expect(source).toMatch(/formData\.append\(["']task_id["']/);
  });
});
