let fs = require("fs");
let path = require("path");
let { parse } = require("./index");

test("single quote", () => expect(parse('a "\\\'"')).toEqual([["a", "'"]]));

test("demo", () => {
  let code = fs.readFileSync(path.join(__dirname, "../test/cirru/demo.cirru"), "utf8");
  let data = require(path.join(__dirname, "../test/ast/demo.json"));
  expect(parse(code)).toEqual(data);
});

test("comma", () => {
  let code = fs.readFileSync(path.join(__dirname, "../test/cirru/comma.cirru"), "utf8");
  let data = require(path.join(__dirname, "../test/ast/comma.json"));
  expect(parse(code)).toEqual(data);
});

test("empty", () => {
  let code = fs.readFileSync(path.join(__dirname, "../test/cirru/empty.cirru"), "utf8");
  let data = require(path.join(__dirname, "../test/ast/empty.json"));
  expect(parse(code)).toEqual(data);
});

test("folded-beginning", () => {
  let code = fs.readFileSync(path.join(__dirname, "../test/cirru/folded-beginning.cirru"), "utf8");
  let data = require(path.join(__dirname, "../test/ast/folded-beginning.json"));
  expect(parse(code)).toEqual(data);
});

test("folding", () => {
  let code = fs.readFileSync(path.join(__dirname, "../test/cirru/folding.cirru"), "utf8");
  let data = require(path.join(__dirname, "../test/ast/folding.json"));
  expect(parse(code)).toEqual(data);
});

test("html", () => {
  let code = fs.readFileSync(path.join(__dirname, "../test/cirru/html.cirru"), "utf8");
  let data = require(path.join(__dirname, "../test/ast/html.json"));
  expect(parse(code)).toEqual(data);
});

test("indent", () => {
  let code = fs.readFileSync(path.join(__dirname, "../test/cirru/indent.cirru"), "utf8");
  let data = require(path.join(__dirname, "../test/ast/indent.json"));
  expect(parse(code)).toEqual(data);
});

test("line", () => {
  let code = fs.readFileSync(path.join(__dirname, "../test/cirru/line.cirru"), "utf8");
  let data = require(path.join(__dirname, "../test/ast/line.json"));
  expect(parse(code)).toEqual(data);
});

test("parentheses", () => {
  let code = fs.readFileSync(path.join(__dirname, "../test/cirru/parentheses.cirru"), "utf8");
  let data = require(path.join(__dirname, "../test/ast/parentheses.json"));
  expect(parse(code)).toEqual(data);
});

test("quote", () => {
  let code = fs.readFileSync(path.join(__dirname, "../test/cirru/quote.cirru"), "utf8");
  let data = require(path.join(__dirname, "../test/ast/quote.json"));
  expect(parse(code)).toEqual(data);
});

test("spaces", () => {
  let code = fs.readFileSync(path.join(__dirname, "../test/cirru/spaces.cirru"), "utf8");
  let data = require(path.join(__dirname, "../test/ast/spaces.json"));
  expect(parse(code)).toEqual(data);
});

test("unfolding", () => {
  let code = fs.readFileSync(path.join(__dirname, "../test/cirru/unfolding.cirru"), "utf8");
  let data = require(path.join(__dirname, "../test/ast/unfolding.json"));
  expect(parse(code)).toEqual(data);
});

test("with escaping", () => {
  let code = `"\'a"`;
  let data = [["'a"]];
  expect(parse(code)).toEqual(data);

  code = `"\\u{3455}"`;
  data = [["\\u{3455}"]];
  expect(parse(code)).toEqual(data);
});
