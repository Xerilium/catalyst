import fs from "fs";
import path from "path";

const resources = path.join(__dirname, "../../src/resources");
const read = (rel: string) =>
  fs.readFileSync(path.join(resources, rel), "utf-8");

describe("plain titles (no AI prefix)", () => {
  // @req FR:pull-request-workflow/titles.plain
  it("issue templates declare plain titles", () => {
    const dir = path.join(resources, "templates/issues");
    for (const f of fs.readdirSync(dir)) {
      const title =
        read(`templates/issues/${f}`).match(/^title:\s*"?(.*?)"?$/m)?.[1] ?? "";
      expect(title).not.toMatch(/\[AI\]|\[Catalyst\]|🤖|⚛️/u);
    }
  });

  // @req FR:pull-request-workflow/titles.explicit
  it.each([
    "playbooks/actions/workflow-closure.md",
    "playbooks/actions/workflow-commit.md",
    "playbooks/update-pull-request.md",
    "playbooks/review-pull-request.md",
  ])("%s says titles stay plain", (rel) => {
    expect(read(rel)).toMatch(/NEVER add (`🤖 \[AI\]`|it to PR, issue)/u);
  });
});
