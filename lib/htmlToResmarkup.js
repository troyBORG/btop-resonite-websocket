export default function htmlToResmarkup(original) {
  var result = original.substring(
    "<html><body><!--StartFragment--><pre><div style='color: #000000; background-color: #ffffff; font-family: courier-new, courier, monospace; font-size: 15px;'>"
      .length,
    original.length - "</pre><!--EndFragment--></body></html>".length,
  )

  // Trim unnecessary spans
  result = result.replaceAll("<span></span>", "")
  result = result.replaceAll("<div>", "")
  result = result.replaceAll("</div>", "\n")

  // Convert color codes
  result = result.replaceAll(
    /<span style='color: (#[0-9a-fA-F]{6}); background-color: (#[0-9a-fA-F]{6});(?: font-weight: (\w+);)?'>/g,
    (match, color, background, weight) =>
      `<color ${color}><mark ${background}>${weight ? "<b>" : ""}`,
  )
  result = result.replaceAll(
    /<span style='background-color: (#[0-9a-fA-F]{6});'>/g,
    (match, background) => `<mark ${background}>`,
  )
  result = result.replaceAll("</span>", "<i></closeall>")
  result = result.replaceAll("<span>", "")

  return result
}
