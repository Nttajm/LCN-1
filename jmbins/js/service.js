export function toggleClass(element, classA, classB) {
  if (!element) return;
  if (element.classList.contains(classA)) {
    element.classList.remove(classA);
    element.classList.add(classB);
  } else {
    element.classList.remove(classB);
    element.classList.add(classA);
  }
}


// const columns = 4;
// for (let i = 0; i < columns; i++) {
//   const column = document.createElement("div");
//   column.classList.add("column");

//   const evenProducts = products.filter((_, idx) => idx % 2 === 0);
//   const oddProducts = products.filter((_, idx) => idx % 2 !== 0);

//   const selectedProducts = i % 2 === 0 ? evenProducts : oddProducts;
//   selectedProducts.forEach((product) => {
//     if (product.sold) return;
//     column.appendChild(createProductItem(product));
//   });

//   container.appendChild(column);
// }
