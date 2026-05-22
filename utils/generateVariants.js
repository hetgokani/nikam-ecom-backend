function generateCombinations(attributes) {
  const result = [];

  function helper(index, current) {
    if (index === attributes.length) {
      result.push(current);
      return;
    }

    const attr = attributes[index];

    attr.values.forEach((value) => {
      helper(index + 1, [...current, { name: attr.name, value: value.label }]);
    });
  }

  helper(0, []);
  return result;
}

module.exports = generateCombinations;
