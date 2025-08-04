/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

// Keep track of selected products
let selectedProducts = [];

// Load selected products from localStorage if available
const savedSelectedProducts = localStorage.getItem("selectedProducts");
if (savedSelectedProducts) {
  try {
    selectedProducts = JSON.parse(savedSelectedProducts);
  } catch (e) {
    selectedProducts = [];
  }
}

// Helper function to save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

// Helper function to update the Selected Products box
function updateSelectedProductsBox() {
  const selectedProductsList = document.getElementById("selectedProductsList");
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected</div>`;
    saveSelectedProducts();
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product-item">
          <img src="${product.image}" alt="${product.name}" />
          <span>${product.name}</span>
          <button class="remove-selected-btn" data-product-name="${product.name}" title="Remove">&times;</button>
        </div>
      `
    )
    .join("");
  saveSelectedProducts();

  // Add event listeners to remove buttons
  const removeBtns = document.querySelectorAll(".remove-selected-btn");
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering card click
      const productName = btn.getAttribute("data-product-name");
      selectedProducts = selectedProducts.filter((p) => p.name !== productName);
      updateSelectedProductsBox();
      // Also update the product grid to unselect the card visually
      const card = document.querySelector(
        `.product-card[data-product-name="${productName}"]`
      );
      if (card) card.classList.remove("selected");
    });
  });
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some((p) => p.name === product.name);
      return `
          <div class="product-card${
            isSelected ? " selected" : ""
          }" data-product-name="${product.name}">
            <img src="${product.image}" alt="${product.name}">
            <div class="product-info">
              <h3>${product.name}</h3>
              <p>${product.brand}</p>
            </div>
            <button class="details-btn" data-product-name="${
              product.name
            }">Details</button>
          </div>
        `;
    })
    .join("");

  // Add click event listeners to each product card for selection
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      // Prevent toggle if Details button was clicked
      if (event.target.classList.contains("details-btn")) return;
      const productName = card.getAttribute("data-product-name");
      const product = products.find((p) => p.name === productName);
      const alreadySelected = selectedProducts.some(
        (p) => p.name === productName
      );
      if (alreadySelected) {
        selectedProducts = selectedProducts.filter(
          (p) => p.name !== productName
        );
        card.classList.remove("selected");
      } else {
        selectedProducts.push(product);
        card.classList.add("selected");
      }
      updateSelectedProductsBox();
    });
  });

  // Add click event listeners to Details buttons
  const detailsBtns = document.querySelectorAll(".details-btn");
  detailsBtns.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent card selection
      const productName = btn.getAttribute("data-product-name");
      const product = products.find((p) => p.name === productName);
      showProductModal(product);
    });
  });
}

// Function to show the product modal with info
function showProductModal(product) {
  document.getElementById("modalProductName").textContent = product.name;
  document.getElementById("modalProductImage").src = product.image;
  document.getElementById("modalProductImage").alt = product.name;
  document.getElementById("modalProductDetails").innerHTML = `
    <div><strong>ID:</strong> ${product.id}</div>
    <div><strong>Brand:</strong> ${product.brand}</div>
    <div><strong>Category:</strong> ${product.category}</div>
    <div><strong>Description:</strong> ${product.description}</div>
  `;
  document.getElementById("productModal").style.display = "flex";
}

// Close modal when X is clicked or background is clicked
const modal = document.getElementById("productModal");
const closeModalBtn = document.getElementById("closeModalBtn");
if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });
}
if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
}

// Robust modal close logic for the X button
function setupModalClose() {
  document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("productModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    if (closeModalBtn && modal) {
      closeModalBtn.onclick = function () {
        modal.style.display = "none";
      };
    }
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) {
          modal.style.display = "none";
        }
      });
    }
  });
}
setupModalClose();

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Helper function to convert simple markdown-like formatting to HTML */
function formatAIResponse(text) {
  // Headings: ### Heading
  text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  // Numbered lists: 1. ...
  text = text.replace(/^(\d+)\. (.*)$/gm, "<li>$1. $2</li>");
  // Bullet lists: - ...
  text = text.replace(/^\- (.*)$/gm, "<li>$1</li>");
  // Wrap consecutive <li> in <ol> or <ul>
  text = text.replace(
    /(<li>\d+\. [\s\S]*?<\/li>)+/g,
    (match) => `<ol>${match.replace(/<li>(\d+\. )/g, "<li>")}</ol>`
  );
  text = text.replace(/(<li>[^<]*<\/li>)+/g, (match) => {
    // Only wrap in <ul> if not already in <ol>
    if (!/^<ol>/.test(match)) return `<ul>${match}</ul>`;
    return match;
  });
  // Bold: **text**
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Links: [text](url)
  text = text.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank">$1</a>'
  );
  // Newlines to <br>
  text = text.replace(/\n/g, "<br>");
  return text;
}

// Store conversation history for context
let conversationMessages = [];

// Helper function to fetch the system message from system-message.txt
async function getSystemMessage() {
  const response = await fetch("system-message.txt");
  return await response.text();
}

// Helper to enable/disable chat input
function setChatInputEnabled(enabled) {
  document.getElementById("userInput").disabled = !enabled;
  document.getElementById("sendBtn").disabled = !enabled;
}

// Chat form submission handler - integrates with Cloudflare OpenAI API listener
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setChatInputEnabled(false);

  // Get the user's message from the input field
  const userInput = document.getElementById("userInput").value;

  // Show user's message in the chat window with label
  chatWindow.innerHTML += `<div class="user-message"><span class='chat-label'>You:</span> ${userInput}</div>`;

  // If this is the first message, add the system message
  if (conversationMessages.length === 0) {
    const systemMessage = await getSystemMessage();
    conversationMessages.push({ role: "system", content: systemMessage });
  }
  // Add the user's message to the conversation, always including selected products JSON
  conversationMessages.push({
    role: "user",
    content: `Here are my selected products as JSON:\n\n${JSON.stringify(
      selectedProducts,
      null,
      2
    )}\n\n${userInput}`,
  });

  // Show a loading message while waiting for the response
  chatWindow.innerHTML += `<div class="assistant-message loading">Thinking...</div>`;

  try {
    // Send the conversation to the Cloudflare listener endpoint
    const response = await fetch(
      "https://chatapphelper.ishmaelelinton.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: conversationMessages }),
      }
    );

    const data = await response.json();

    // Remove the loading message
    const loadingMsg = chatWindow.querySelector(".assistant-message.loading");
    if (loadingMsg) loadingMsg.remove();

    // Check for a valid response from the API
    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      const aiReply = data.choices[0].message.content;
      chatWindow.innerHTML += `<div class="assistant-message"><span class='chat-label'>L'Oréal Beauty Assistant:</span> ${formatAIResponse(
        aiReply
      )}</div>`;
      scrollChatToBottom();
      // Add assistant's reply to the conversation
      conversationMessages.push({ role: "assistant", content: aiReply });
    } else {
      chatWindow.innerHTML += `<div class="assistant-message error">Sorry, I couldn't get a response.</div>`;
    }
  } catch (error) {
    // Show an error message if something goes wrong
    chatWindow.innerHTML += `<div class="assistant-message error">Error: ${error.message}</div>`;
  }
  setChatInputEnabled(true);
});

// Handle Generate Routine button click
const generateRoutineBtn = document.getElementById("generateRoutine");
generateRoutineBtn.addEventListener("click", async () => {
  setChatInputEnabled(false);
  generateRoutineBtn.disabled = true;
  // Scroll chatbox into view
  document
    .querySelector(".chatbox")
    .scrollIntoView({ behavior: "smooth", block: "start" });
  // Only show a loading message, do not show the user message
  chatWindow.innerHTML += `<div class="assistant-message loading">Thinking...</div>`;
  // If this is the first message, add the system message
  if (conversationMessages.length === 0) {
    const systemMessage = await getSystemMessage();
    conversationMessages.push({ role: "system", content: systemMessage });
  }
  // Add the user's routine request to the conversation
  conversationMessages.push({
    role: "user",
    content: `Here are my selected products as JSON:\n\n${JSON.stringify(
      selectedProducts,
      null,
      2
    )}\n\nPlease build me a personalized routine using only these products.`,
  });
  try {
    const response = await fetch(
      "https://chatapphelper.ishmaelelinton.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: conversationMessages }),
      }
    );
    const data = await response.json();
    const loadingMsg = chatWindow.querySelector(".assistant-message.loading");
    if (loadingMsg) loadingMsg.remove();
    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      const aiReply = data.choices[0].message.content;
      chatWindow.innerHTML += `<div class="assistant-message"><span class='chat-label'>L'Oréal Beauty Assistant:</span> ${formatAIResponse(
        aiReply
      )}</div>`;
      scrollChatToBottom();
      // Add assistant's reply to the conversation
      conversationMessages.push({ role: "assistant", content: aiReply });
    } else {
      chatWindow.innerHTML += `<div class="assistant-message error">Sorry, I couldn't get a response.</div>`;
    }
  } catch (error) {
    chatWindow.innerHTML += `<div class="assistant-message error">Error: ${error.message}</div>`;
  }
  setChatInputEnabled(true);
  generateRoutineBtn.disabled = false;
});

// Helper function to smoothly scroll chat to bottom
function scrollChatToBottom() {
  chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: "smooth" });
}

// Update selected products box on page load
updateSelectedProductsBox();
