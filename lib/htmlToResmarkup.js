export default function htmlToResmarkup(original) {
  // Remove header and footer tags
  var result = original.substring(
    "<html><body><!--StartFragment--><pre><div style='color: #000000; background-color: #ffffff; font-family: courier-new, courier, monospace; font-size: 15px;'>"
      .length,
    original.length - "</pre><!--EndFragment--></body></html>".length,
  )

  // Trim structural tags
  result = result.replaceAll("<span></span>", "")
  result = result.replaceAll("<div>", "")
  result = result.replaceAll("</div>", "\n")

  result = result.replaceAll("<span style='font-weight: bold;'>", "<b>")

  // Convert color codes
  result = result.replaceAll(
    /<span style='color: (#[0-9a-fA-F]{6}); background-color: (#[0-9a-fA-F]{6});(?: font-weight: (\w+);)?'>/g,
    (match, color, background, weight) =>
      `<color ${color}><mark ${background}>${weight ? "<b>" : ""}`,
  )
  result = result.replaceAll(
    /<span style='color: (#[0-9a-fA-F]{6});(?: font-weight: (\w+);)?'>/g,
    (match, color, weight) => `<color ${color}>${weight ? "<b>" : ""}`,
  )
  result = result.replaceAll(
    /<span style='background-color: (#[0-9a-fA-F]{6});'>/g,
    (match, background) => `<mark ${background}>`,
  )
  result = result.replaceAll("</span>", "<i></closeall>") // Adding an <i> tag since </closeall> needs as lest something
  result = result.replaceAll("<span>", "")

  return result
}
