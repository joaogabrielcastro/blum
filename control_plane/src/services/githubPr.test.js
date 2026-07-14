const {
  parsePrUrl,
  extractPrNumberFromUrl,
  extractBranchFromGit,
  parseRepoFullName,
} = require("./githubPr");

describe("githubPr helpers", () => {
  test("parsePrUrl", () => {
    expect(
      parsePrUrl("https://github.com/joaogabrielcastro/blum/pull/42"),
    ).toEqual({
      repoFullName: "joaogabrielcastro/blum",
      prNumber: 42,
      prUrl: "https://github.com/joaogabrielcastro/blum/pull/42",
    });
  });

  test("extractPrNumberFromUrl", () => {
    expect(
      extractPrNumberFromUrl("https://github.com/acme/app/pull/9"),
    ).toBe(9);
    expect(extractPrNumberFromUrl("nope")).toBeNull();
  });

  test("extractBranchFromGit", () => {
    expect(
      extractBranchFromGit({
        branches: [
          {
            repoUrl: "https://github.com/a/b",
            branch: "fix/x",
            prUrl: "https://github.com/a/b/pull/1",
          },
        ],
      }),
    ).toEqual({
      branch: "fix/x",
      prUrl: "https://github.com/a/b/pull/1",
    });
  });

  test("parseRepoFullName", () => {
    expect(parseRepoFullName("https://github.com/a/b.git")).toBe("a/b");
    expect(parseRepoFullName("a/b")).toBe("a/b");
  });
});
