describe("last section (item 51)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.resetModules();
    window.history.pushState({}, "", "/");
  });

  const load = () => require("./lastSection");

  test("a new visitor gets the balanced home", () => {
    expect(load().lastSectionRedirect()).toBeNull();
  });

  test("a returning logistics visitor goes to logistics; a services visitor stays on home", () => {
    localStorage.setItem("lastSection", "logistics");
    expect(load().lastSectionRedirect()).toBe("/logistics");
    jest.resetModules();
    sessionStorage.clear();
    localStorage.setItem("lastSection", "services");
    expect(load().lastSectionRedirect()).toBeNull();
  });

  test("only the first page of a tab redirects, so the logo still reaches home", () => {
    localStorage.setItem("lastSection", "logistics");
    const first = load();
    expect(first.lastSectionRedirect()).toBe("/logistics");
    first.consumeLastSectionRedirect();
    expect(first.lastSectionRedirect()).toBeNull();
    jest.resetModules();
    expect(load().lastSectionRedirect()).toBeNull();
  });

  test("the switcher's tasker choice is saved as services", () => {
    const { setLastSection, getLastSection } = load();
    setLastSection("tasker");
    expect(getLastSection()).toBe("services");
  });
});
