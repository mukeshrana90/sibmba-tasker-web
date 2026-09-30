import {
  getActiveModule,
  resolveActiveModule,
  setActiveModule,
  syncActiveModuleFromPath,
} from "../../utils/Roles";

describe("ModuleSwitcher persistence helpers", () => {
  beforeEach(() => localStorage.clear());

  it("switches between tasker and logistics", () => {
    expect(getActiveModule()).toBe("tasker");
    setActiveModule("logistics");
    expect(getActiveModule()).toBe("logistics");
    setActiveModule("tasker");
    expect(getActiveModule()).toBe("tasker");
  });

  it("keeps logistics menus on shared chrome paths like /messages", () => {
    setActiveModule("logistics");
    expect(resolveActiveModule("/messages")).toBe("logistics");
    expect(resolveActiveModule("/profile")).toBe("logistics");
    expect(syncActiveModuleFromPath("/messages")).toBe("logistics");
    expect(getActiveModule()).toBe("logistics");
  });

  it("forces logistics on /logistics and tasker on Tasker pages", () => {
    expect(resolveActiveModule("/logistics/post")).toBe("logistics");
    syncActiveModuleFromPath("/logistics/post");
    expect(getActiveModule()).toBe("logistics");

    expect(resolveActiveModule("/services")).toBe("tasker");
    syncActiveModuleFromPath("/services");
    expect(getActiveModule()).toBe("tasker");
  });
});
