const dimensions = [
  "Retail Price",
  "Dealer Cost",
  "Engine Size (l)",
  "Cyl",
  "HP",
  "City MPG",
  "Hwy MPG",
  "Weight",
  "Wheel Base",
  "Len",
  "Width"
];

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

let allData = [];
let selectedCategories = new Set(categories);
let brushRanges = {};
let dimensionOrder = [...dimensions];

function getCategory(car) {
  if (+car["Sports Car"] === 1) return "Sports Car";
  if (+car["SUV"] === 1) return "SUV";
  if (+car["Wagon"] === 1) return "Wagon";
  if (+car["Minivan"] === 1) return "Minivan";
  if (+car["Pickup"] === 1) return "Pickup";
  return "Sedan";
}

d3.csv("data/cars.csv")
  .then((data) => {
    allData = data.map((car) => {
      dimensions.forEach((dimension) => {
        car[dimension] = +car[dimension];
      });

      car.category = getCategory(car);
      return car;
    });

    createCategoryControls();
    drawParallelCoordinates();
  })
  .catch((error) => {
    console.error(error);
    document.getElementById("status").textContent =
      "数据读取失败，请检查 data/cars.csv 文件路径。";
  });

function createCategoryControls() {
  const controls = d3.select("#category-controls");

  categories.forEach((category) => {
    const label = controls.append("label")
      .attr("class", "category-item");

    label.append("input")
      .attr("type", "checkbox")
      .attr("value", category)
      .property("checked", true)
      .on("change", function () {
        if (this.checked) {
          selectedCategories.add(category);
        } else {
          selectedCategories.delete(category);
        }

        drawParallelCoordinates();
      });

    label.append("span")
      .attr("class", "color-dot")
      .style("background-color", colors[category]);

    label.append("span").text(category);
  });

  d3.select("#reset-button").on("click", () => {
    selectedCategories = new Set(categories);
    brushRanges = {};
    dimensionOrder = [...dimensions];

    d3.selectAll("#category-controls input")
      .property("checked", true);

    drawParallelCoordinates();
  });
}

function getFilteredData() {
  return allData.filter((car) => {
    const categoryPassed = selectedCategories.has(car.category);

    const brushPassed = Object.entries(brushRanges).every(
      ([dimension, range]) =>
        car[dimension] >= range[0] && car[dimension] <= range[1]
    );

    return categoryPassed && brushPassed;
  });
}

function drawParallelCoordinates() {
  d3.select("#chart").selectAll("*").remove();

  const margin = { top: 60, right: 45, bottom: 80, left: 55 };
  const width = 1350 - margin.left - margin.right;
  const height = 650 - margin.top - margin.bottom;
  const dragging = {};

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scalePoint()
    .domain(dimensionOrder)
    .range([0, width])
    .padding(0.3);

  const y = {};

  dimensions.forEach((dimension) => {
    y[dimension] = d3.scaleLinear()
      .domain(d3.extent(allData, (d) => d[dimension]))
      .nice()
      .range([height, 0]);
  });

  function position(dimension) {
    return dragging[dimension] === undefined
      ? x(dimension)
      : dragging[dimension];
  }

  function linePath(car) {
    return d3.line()(
      dimensionOrder.map((dimension) => [
        position(dimension),
        y[dimension](car[dimension])
      ])
    );
  }

  const lineLayer = chart.append("g");

  function updateLines() {
    const filteredData = getFilteredData();
    const activeBrushes = Object.keys(brushRanges).length;

    document.getElementById("status").textContent =
      `当前显示 ${filteredData.length} / ${allData.length} 条汽车记录，` +
      `使用 ${dimensions.length} 个数值维度，已启用 ${activeBrushes} 个数值区间筛选。` +
      " 可拖动坐标轴标题改变维度顺序。";

    lineLayer.selectAll("path")
      .data(filteredData, (d) => d["Vehicle Name"])
      .join("path")
      .attr("class", "car-line")
      .attr("d", linePath)
      .attr("stroke", (d) => colors[d.category]);
  }

  const axes = chart.append("g")
    .selectAll(".axis")
    .data(dimensionOrder)
    .join("g")
    .attr("class", "axis")
    .attr("transform", (dimension) => `translate(${x(dimension)},0)`)
    .call(
      d3.drag()
        .on("start", function (event, dimension) {
          dragging[dimension] = x(dimension);
          d3.select(this).raise().classed("dragging", true);
        })
        .on("drag", function (event, dimension) {
          dragging[dimension] = Math.max(0, Math.min(width, event.x));

          axes.attr(
            "transform",
            (d) => `translate(${position(d)},0)`
          );

          lineLayer.selectAll("path").attr("d", linePath);
        })
        .on("end", function (event, dimension) {
          dimensionOrder.sort((a, b) => position(a) - position(b));
          x.domain(dimensionOrder);

          delete dragging[dimension];
          d3.select(this).classed("dragging", false);

          axes.transition()
            .duration(350)
            .attr("transform", (d) => `translate(${x(d)},0)`);

          lineLayer.selectAll("path")
            .transition()
            .duration(350)
            .attr("d", linePath);
        })
    );

  axes.each(function (dimension) {
    d3.select(this).call(d3.axisLeft(y[dimension]).ticks(7));
  });

  axes.append("text")
    .attr("class", "axis-title")
    .attr("y", -16)
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-35)")
    .text((dimension) => dimension);

  axes.each(function (dimension) {
    const brush = d3.brushY()
      .extent([[-13, 0], [13, height]])
      .on("brush end", (event) => {
        if (event.selection) {
          const [top, bottom] = event.selection;

          brushRanges[dimension] = [
            y[dimension].invert(bottom),
            y[dimension].invert(top)
          ];
        } else {
          delete brushRanges[dimension];
        }

        updateLines();
      });

    const brushGroup = d3.select(this)
      .append("g")
      .attr("class", "brush")
      .call(brush);

    if (brushRanges[dimension]) {
      const [low, high] = brushRanges[dimension];

      brushGroup.call(brush.move, [
        y[dimension](high),
        y[dimension](low)
      ]);
    }
  });

  updateLines();
}