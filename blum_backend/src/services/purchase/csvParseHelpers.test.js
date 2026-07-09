const { getValueByHeader, parseCsvLine } = require("./csvParseHelpers");

describe("csvParseHelpers", () => {
  test("parseCsvLine respeita aspas", () => {
    expect(parseCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
  });

  test("parseCsvLine separa por vírgula simples", () => {
    expect(parseCsvLine("1,2,3")).toEqual(["1", "2", "3"]);
  });

  test("getValueByHeader encontra coluna por alias", () => {
    const headers = ["codigo", "preco"];
    const values = ["ABC", "10.5"];
    expect(getValueByHeader(headers, values, ["codigo", "code"])).toBe("ABC");
    expect(getValueByHeader(headers, values, ["inexistente"])).toBe("");
  });
});
