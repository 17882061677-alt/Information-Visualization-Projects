const categories = [
  "Sedan",
  "Sports Car",
  "SUV",
  "Wagon",
  "Minivan",
  "Pickup"
];

const colors = {
  Sedan: "#2563eb",
  "Sports Car": "#dc2626",
  SUV: "#16a34a",
  Wagon: "#9333ea",
  Minivan: "#ea580c",
  Pickup: "#0891b2"
};

function getCategory(car) {
  if (+car["Sports Car"] === 1) return "Sports Car";
  if (+car["SUV"] === 1) return "SUV";
  if (+car["Wagon"] === 1) return "Wagon";
  if (+car["Minivan"] === 1) return "Minivan";
  if (+car["Pickup"] === 1) return "Pickup";
  return "Sedan";
}

function getBrand(vehicleName) {
  const multiWordBrands = [
    "Aston Martin",
    "Land Rover",
    "Mercedes-Benz",
    "Rolls-Royce"
  ];

  for (const brand of multiWordBrands) {
    if (vehicleName.startsWith(brand)) {
      return brand;
    }
  }

  return vehicleName.split(" ")[0];
}

function getCategoryFromNode(node) {
  const categoryNode = node.ancestors()
    .find((ancestor) => ancestor.depth === 1);

  return categoryNode ? categoryNode.data.name : "Sedan";
}

d3.csv("data/cars.csv")
  .then((data) => {
    const cars = data.map((car) => ({
      ...car,
      category: getCategory(car),
      brand: getBrand(car["Vehicle Name"]),
      price: +car["Retail Price"],
      hp: +car.HP,
      cityMPG: +car["City MPG"],
      hwyMPG: +car["Hwy MPG"]
    }));

    drawTreemap(cars);
  })
  .catch((error) => {
    console.error(error);
    document.getElementById("status").textContent =
      "数据读取失败，请检查 data/cars.csv 文件路径。";
  });

function drawTreemap(cars) {
  const hierarchyData = {
    name: "全部汽车",
    children: categories.map((category) => {
      const categoryCars = cars.filter((car) => car.category === category);

      const brands = d3.group(categoryCars, (car) => car.brand);

      return {
        name: category,
        type: "category",
        children: Array.from(brands, ([brand, models]) => ({
          name: brand,
          type: "brand",
          children: models.map((car) => ({
            ...car,
            name: car["Vehicle Name"],
            type: "car",
            value: car.price
          }))
        }))
      };
    })
  };

  const root = d3.hierarchy(hierarchyData)
    .sum((d) => d.value || 0)
    .sort((a, b) => b.value - a.value);

  const width = 1350;
  const height = 720;

  d3.treemap()
    .size([width, height])
    .paddingOuter(6)
    .paddingInner(2)
    .paddingTop((node) => {
      if (node.depth === 1) return 28;
      if (node.depth === 2) return 18;
      return 0;
    })(root);

  document.getElementById("status").textContent =
    `已加载 ${cars.length} 条汽车记录，构建“车型类别—品牌—具体车型”三级层级结构。`;

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const chart = svg.append("g");

  const tooltip = d3.select("#tooltip");

  const categoryNodes = root.descendants()
    .filter((node) => node.depth === 1);

  chart.selectAll(".category-bg")
    .data(categoryNodes)
    .join("rect")
    .attr("class", "category-bg")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("fill", (d) => colors[d.data.name])
    .attr("fill-opacity", 0.12);

  chart.selectAll(".category-label")
    .data(categoryNodes)
    .join("text")
    .attr("class", "category-label")
    .attr("x", (d) => d.x0 + 8)
    .attr("y", (d) => d.y0 + 20)
    .text((d) => d.data.name);

  const brandNodes = root.descendants()
    .filter((node) =>
      node.depth === 2 &&
      node.x1 - node.x0 > 75 &&
      node.y1 - node.y0 > 32
    );

  chart.selectAll(".brand-label")
    .data(brandNodes)
    .join("text")
    .attr("class", "brand-label")
    .attr("x", (d) => d.x0 + 4)
    .attr("y", (d) => d.y0 + 13)
    .text((d) => d.data.name);

  chart.selectAll(".group-border")
    .data(root.descendants().filter((node) => node.depth === 1 || node.depth === 2))
    .join("rect")
    .attr("class", "group-border")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0);

  const leaves = root.leaves();

  chart.selectAll(".car-cell")
    .data(leaves)
    .join("rect")
    .attr("class", "car-cell")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("width", (d) => Math.max(0, d.x1 - d.x0))
    .attr("height", (d) => Math.max(0, d.y1 - d.y0))
    .attr("fill", (d) => colors[getCategoryFromNode(d)])
    .attr("fill-opacity", 0.72)
    .on("mousemove", function (event, d) {
      const car = d.data;

      tooltip
        .style("display", "block")
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY + 14}px`)
        .html(`
          <strong>${car.name}</strong><br>
          品牌：${car.brand}<br>
          类型：${car.category}<br>
          零售价格：$${d3.format(",")(car.price)}<br>
          马力：${car.hp} HP<br>
          城市油耗：${car.cityMPG} MPG
        `);
    })
    .on("mouseleave", () => {
      tooltip.style("display", "none");
    })
    .on("click", function (event, d) {
      d3.selectAll(".car-cell").classed("is-selected", false);
      d3.select(this).classed("is-selected", true);

      const car = d.data;

      document.getElementById("selected-info").innerHTML =
        `<strong>当前选中：</strong>${car.name}　` +
        `品牌：${car.brand}　` +
        `类别：${car.category}　` +
        `零售价格：$${d3.format(",")(car.price)}　` +
        `马力：${car.hp} HP`;
    });
}