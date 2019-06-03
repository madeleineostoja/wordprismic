require 'kramdown-prismic'
require 'json'

parsed = Kramdown::Document.new(ARGV.first, input: :html).to_prismic
$stdout.puts parsed.to_json