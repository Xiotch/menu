import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhIAwkU0YTIPqHCnZaS8q-yyDCP8CktL0",
  authDomain: "tecxua-a22c9.firebaseapp.com",
  projectId: "tecxua-a22c9",
  storageBucket: "tecxua-a22c9.appspot.com",
  messagingSenderId: "242362635527",
  appId: "1:242362635527:web:179a57cf5a43bf8d77e1a2",
};
// Add this after Firebase config
function sortCategories(categories) {
    return categories.sort((a, b) => a.name.localeCompare(b.name));
}
// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'dilwgelll';
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get restaurant ID from URL or localStorage
const urlParams = new URLSearchParams(window.location.search);
let restaurantId = urlParams.get("restaurant") || localStorage.getItem("restaurantId");

// If no restaurant ID in URL, check for restaurant_name parameter
if (!restaurantId) {
  restaurantId = urlParams.get("restaurant_name");
}

if (!restaurantId) {
  showError("No restaurant specified. Please access this page with ?restaurant=ID in the URL");
} else {
  localStorage.setItem("restaurantId", restaurantId);
  loadAndApplyTheme();
  loadMenuData();
}

// Function to get optimized image URL from Cloudinary
function getOptimizedImageUrl(imageUrl, width = 300, height = 200, crop = 'fill') {
  if (!imageUrl) return null;
  
  // If it's already a Cloudinary URL, apply transformations
  if (imageUrl.includes('res.cloudinary.com')) {
    // Extract the path after /upload/
    const pathParts = imageUrl.split('/upload/');
    if (pathParts.length === 2) {
      return `${pathParts[0]}/upload/w_${width},h_${height},c_${crop}/${pathParts[1]}`;
    }
  }
  
  // Return original URL if not Cloudinary
  return imageUrl;
}

// Load and apply custom theme from Firestore
async function loadAndApplyTheme() {
  try {
    const themeDocRef = doc(db, "restaurants", restaurantId, "settings", "theme");
    const themeSnap = await getDoc(themeDocRef);
    if (themeSnap.exists()) {
      const theme = themeSnap.data();

      // Apply CSS variables dynamically
      const root = document.documentElement;
      root.style.setProperty("--primary", theme.primary || "#6c5ce7");
      root.style.setProperty("--primary-dark", theme.primary ? shadeColor(theme.primary, -15) : "#5a4ad1");
      root.style.setProperty("--secondary", theme.secondary || "#a29bfe");
      root.style.setProperty("--dark", theme.dark || "#292f36");
      root.style.setProperty("--light", theme.light || "#f7fff7");
      root.style.setProperty("--accent", theme.accent || "#ffd166");
    }
  } catch (error) {
    console.error("Error loading theme:", error);
  }
}

// Utils: shade a hex color by percent (-100 to 100)
function shadeColor(color, percent) {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = Math.min(255, Math.max(0, Math.round(R * (100 + percent) / 100)));
  G = Math.min(255, Math.max(0, Math.round(G * (100 + percent) / 100)));
  B = Math.min(255, Math.max(0, Math.round(B * (100 + percent) / 100)));

  const RR = (R.toString(16).length === 1 ? "0" : "") + R.toString(16);
  const GG = (G.toString(16).length === 1 ? "0" : "") + G.toString(16);
  const BB = (B.toString(16).length === 1 ? "0" : "") + B.toString(16);

  return "#" + RR + GG + BB;
}

// Helper function to get appropriate icon based on category name
function getCategoryIcon(categoryName) {
  const name = categoryName.toLowerCase();

  // Check for beverage-related categories
  if (name.includes('beverage') || 
      name.includes('drink') || 
      name.includes('juice') ||
      name.includes('mocktail') ||
      name.includes('smoothie')) {
    return 'fas fa-wine-glass';
    }
    if(name.includes('coffee') || name.includes('tea')){
      return 'fas fa-mug-hot';
    } 
  return 'fas fa-utensils'//Default icon
}

// Function to populate categories in the modal
function populateCategoryModal(categories) {
  const modalCategoryList = document.getElementById("modal-category-list");
  
  // Clear existing items (except "All Categories")
  while (modalCategoryList.children.length > 1) {
    modalCategoryList.removeChild(modalCategoryList.lastChild);
  }
  
  // Add categories to modal
  categories.forEach(category => {
    const li = document.createElement('li');
    li.className = 'category-item';
    li.dataset.value = category.id;
    li.innerHTML = `
      <span class="category-icon"><i class="fas ${getCategoryIcon(category.name)}"></i></span>
      ${category.name}
    `;
    modalCategoryList.appendChild(li);
  });
  
  // Add event listeners to category items
  document.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', () => {
      const value = item.dataset.value;
      
      // Update dropdown to match selection
      const categoryFilter = document.getElementById("category-filter");
      categoryFilter.value = value;
      
      // Highlight selected category in modal
      document.querySelectorAll('.category-item').forEach(i => {
        i.classList.remove('active');
      });
      item.classList.add('active');
      
      // Close modal after selection
      const categoryModal = document.getElementById('category-modal');
      categoryModal.classList.remove('active');
      document.body.style.overflow = '';
      
      // Trigger category change
      filterMenuItems(value);
    });
  });
}

// Modal functionality
function setupModal() {
  const categoryModal = document.getElementById('category-modal');
  const categoryModalBtn = document.getElementById('category-modal-btn');
  const closeModalBtn = document.querySelector('.close-modal');
  const categoryFilter = document.getElementById("category-filter");
  
  // Open modal when clicking the categories button (mobile)
  if (categoryModalBtn) {
    categoryModalBtn.addEventListener('click', () => {
      categoryModal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    });
  }
  
  // Open modal when clicking the dropdown (desktop)
  if (categoryFilter) {
    categoryFilter.addEventListener('click', (e) => {
      // Only open modal on desktop
      if (window.innerWidth >= 769) {
        e.preventDefault();
        categoryModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  }
  
  // Close modal when clicking the close button
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      categoryModal.classList.remove('active');
      document.body.style.overflow = ''; // Re-enable scrolling
    });
  }
  
  // Close modal when clicking outside the content
  categoryModal.addEventListener('click', (e) => {
    if (e.target === categoryModal) {
      categoryModal.classList.remove('active');
      document.body.style.overflow = ''; // Re-enable scrolling
    }
  });
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && categoryModal.classList.contains('active')) {
      categoryModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

// Update the populateCategoryFilter function
function populateCategoryFilter(categories) {
  const filter = document.getElementById("category-filter");

  // Clear existing options except "All Categories"
  while (filter.options.length > 1) {
    filter.remove(1);
  }

  // Add categories to filter
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    filter.appendChild(option);
  });

  // Add event listener for filtering
  filter.addEventListener("change", () => {
    const categoryId = filter.value;
    filterMenuItems(categoryId);
    
    // Highlight selected category in modal
    document.querySelectorAll('.category-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.value === categoryId) {
        item.classList.add('active');
      }
    });
    
    // Scroll to top on category change
    const menuControls = document.querySelector(".menu-controls");
    if (menuControls) {
      window.scrollTo({ top: menuControls.offsetTop - 10, behavior: "smooth" });
    }
  });
}

async function loadMenuData() {
  try {
    showLoading();

    // Get restaurant details
    const restaurantRef = doc(db, "restaurants", restaurantId);
    const restaurantSnap = await getDoc(restaurantRef);

    if (!restaurantSnap.exists()) {
      throw new Error("Restaurant not found");
    }

    const restaurantData = restaurantSnap.data();
    
    // CHECK RESTAURANT STATUS
    const status = restaurantData.status ? restaurantData.status.toLowerCase() : '';
    if (status === 'inactive') {
      showError("This restaurant is currently inactive. Please contact the owner.");
      return;
    }
    
    if (status !== 'active') {
      showError("This restaurant is not currently active. Please contact the owner.");
      return;
    }
    
    // CHECK LICENSE EXPIRY
    if (restaurantData.license_expiry) {
      const expiryDate = new Date(restaurantData.license_expiry);
      const today = new Date();
      if (expiryDate < today) {
        showError("This restaurant's license has expired. Please contact support.");
        return;
      }
    }

    // Get categories and menu items in parallel
    const [categoriesSnap, menuItemsSnap] = await Promise.all([
      getDocs(collection(db, "restaurants", restaurantId, "categories")),
      getDocs(
        query(collection(db, "restaurants", restaurantId, "menu"), orderBy("createdAt", "desc"))
      ),
    ]);

    // Update restaurant info
    updateRestaurantInfo(restaurantData);

    // Replace with this:
const categories = categoriesSnap.docs
  .map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
  .sort((a, b) => {
    // Sort by name alphabetically
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  });
    const sortedCategories = sortCategories(categories);
    // Use sortedCategories instead of categories when populating
populateCategoryFilter(sortedCategories);
populateCategoryModal(sortedCategories);
    // Process menu items
    const menuItems = menuItemsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Setup modal first
    setupModal();
    
    // Then populate category filter and modal
    populateCategoryFilter(categories);
    populateCategoryModal(categories);

    // Render the menu
    renderMenu(categories, menuItems);
  } catch (error) {
    console.error("Error loading menu:", error);
    showError(error.message || "Failed to load menu data");
  }
}

function updateRestaurantInfo(restaurant) {
  document.title = `${restaurant.name} Menu`;
  document.getElementById("restaurant-name").textContent = restaurant.name;

  // Set logo if available - using Cloudinary optimization
  if (restaurant.logoUrl) {
    const logoImg = document.getElementById("restaurant-logo");
    // Optimize logo for display (100x100 with fill crop)
    logoImg.src = getOptimizedImageUrl(restaurant.logoUrl, 100, 100, 'fill');
    logoImg.onerror = () => {
      logoImg.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2QxZDFkMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkeD0iLTI1IiBkeT0iMTAiI�leHQtYW5jaG9y=";
    };
  }

  // Set address and contact info
  if (restaurant.address) {
    document.getElementById("restaurant-address").textContent = restaurant.address;
  }
  if (restaurant.phone) {
    document.getElementById("restaurant-phone").textContent = restaurant.phone;
  }
}

function renderMenu(categories, menuItems) {
  // Create a map of categories for easy lookup
  const categoryMap = {};
  categories.forEach((category) => {
    categoryMap[category.id] = category;
  });

  // Store menu items for filtering
  window.menuItems = menuItems;
  window.categoryMap = categoryMap;

  // Render all items initially
  filterMenuItems("all");
}

function filterMenuItems(categoryId) {
  const menuContainer = document.getElementById("menu-container");

  // Filter items based on category
  let filteredItems = window.menuItems;
  if (categoryId !== "all") {
    filteredItems = window.menuItems.filter((item) => item.category === categoryId);
  }

  // Group items by category
  const itemsByCategory = {};
  filteredItems.forEach((item) => {
    const categoryId = item.category;
    if (!itemsByCategory[categoryId]) {
      itemsByCategory[categoryId] = {
        category: window.categoryMap[categoryId],
        items: [],
      };
    }
    itemsByCategory[categoryId].items.push(item);
  });

  // Generate HTML
  let menuHTML = "";

 
  // Featured items (show only when viewing all categories)
if (categoryId === "all") {
  const featuredItems = filteredItems.filter((item) => item.isFeatured);
  if (featuredItems.length > 0) {
    menuHTML += `
      <div class="menu-section featured-section">
        <div class="featured-header">
          <h2 class="section-title">Featured Items</h2>
          <div class="scroll-controls">
            <button class="scroll-btn prev" aria-label="Previous">
              <i class="fas fa-chevron-left"></i>
            </button>
            <button class="scroll-btn next" aria-label="Next">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
        <div class="featured-slider">
          <div class="featured-track">
            ${featuredItems.map((item) => `
              <div class="featured-item">
                ${createMenuItemHTML(item)}
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    // Initialize scroll functionality after rendering
    setTimeout(() => initializeFeaturedSlider(), 100);
  }
}

  // Regular categories
  Object.values(itemsByCategory).forEach(({ category, items }) => {
    if (items.length > 0) {
      menuHTML += `
        <div class="menu-section">
          <h2 class="section-title">${category.name}</h2>
          <div class="menu-row-list">
            ${items.map((item) => createMenuItemHTML(item)).join("")}
          </div>
        </div>
      `;
    }
  });

  // Uncategorized items
  const uncategorizedItems = filteredItems.filter((item) => !window.categoryMap[item.category]);
  if (uncategorizedItems.length > 0) {
    menuHTML += `
      <div class="menu-section">
        <h2 class="section-title">Other Items</h2>
        <div class="menu-row-list">
          ${uncategorizedItems.map((item) => createMenuItemHTML(item)).join("")}
        </div>
      </div>
    `;
  }

  menuContainer.innerHTML =
    menuHTML ||
    `
    <div class="text-center py-5">
      <i class="fas fa-utensils fa-3x mb-3" style="color: var(--primary);"></i>
      <h3>No items found</h3>
      <p>No menu items available in this category</p>
    </div>
    `;
}

function createMenuItemHTML(item) {
  const availabilityClass = {
    available: "available",
    unavailable: "unavailable",
    seasonal: "seasonal",
  }[item.availability] || "";

  const itemIdAttr = item.id || "";

  // Optimized image (120x120 for row view)
  const optimizedImageUrl = item.imageUrl
    ? getOptimizedImageUrl(item.imageUrl, 120, 120, "fill")
    : "/assets/images/Dish-placeholder.jpg";

  return `
  <div class="menu-row-card" data-item-id="${itemIdAttr}">
    <div class="row-image">
      <img
        src="${optimizedImageUrl}"
        alt="${item.name}"
        loading="lazy"
        onerror="this.src='/assets/images/Dish-placeholder.jpg"'"
      />
      ${item.isFeatured ? '<span class="featured-badge">Featured</span>' : ""}
    </div>
    <div class="row-content">
      <h3 class="item-name">${item.name}</h3>
      ${item.description ? `<p class="item-description">${item.description}</p>` : ""}
      <div class="row-footer">
        <span class="item-price">₹${(item.price || 0).toFixed(2)}</span>
        ${
          item.availability
            ? `<span class="availability ${availabilityClass}">${item.availability}</span>`
            : ""
        }
        <button
          class="favorite-btn"
          title="Toggle Favorite"
          role="button"
          aria-pressed="false"
          tabindex="0"
        >
          <i class="fas fa-heart"></i>
        </button>
      </div>
    </div>
  </div>
  `;
}


function showLoading() {
  document.getElementById("menu-container").innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-circle-notch fa-spin fa-2x"></i>
    </div>
  `;
}

function showError(message) {
  document.getElementById("menu-container").innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Error Loading Menu</h3>
      <p>${message}</p>
      <button class="btn btn-primary mt-3" onclick="window.location.reload()">
        <i class="fas fa-sync-alt"></i> Try Again
      </button>
    </div>
  `;
}

// Set current year dynamically
document.getElementById('currentYear').textContent = new Date().getFullYear();

// DOM Content Loaded Event
document.addEventListener("DOMContentLoaded", () => {
  const menuContainer = document.getElementById("menu-container");
  const menuControls = document.querySelector(".menu-controls");

  // Sticky menu filter shadow on scroll
  window.addEventListener("scroll", () => {
    if (window.scrollY > 10) {
      menuControls.classList.add("scrolled");
    } else {
      menuControls.classList.remove("scrolled");
    }
  });

  // Delegate favorite button toggle (UI only)
  menuContainer.addEventListener("click", (e) => {
    if (e.target.closest(".favorite-btn")) {
      const favBtn = e.target.closest(".favorite-btn");
      const pressed = favBtn.getAttribute("aria-pressed") === "true";
      favBtn.setAttribute("aria-pressed", String(!pressed));
      favBtn.classList.toggle("favorited");
      e.stopPropagation();
    }
  });

  // Keyboard accessibility toggle for favorite buttons
  menuContainer.addEventListener("keydown", (e) => {
    if (
      e.target.classList.contains("favorite-btn") &&
      (e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      e.target.click();
    }
  });
});

// Payment functionality
document.getElementById("pay-bill-btn").addEventListener("click", () => {
  const modal = document.getElementById("pay-bill-modal");
  modal.style.display = "flex";
  document.getElementById("bill-amount-input").value = "";
  document.getElementById("payment-options").style.display = "none";
});

document.getElementById("close-pay-bill").addEventListener("click", () => {
  document.getElementById("pay-bill-modal").style.display = "none";
});

const billInput = document.getElementById("bill-amount-input");

billInput.addEventListener("input", () => {
  const val = parseFloat(billInput.value);
  const options = document.getElementById("payment-options");
  if (val > 0) {
    options.style.display = "block";
  } else {
    options.style.display = "none";
  }
});

// Change this object after fetching admin UPI IDs from Firestore
let adminUPIIds = {
  phonepe: "phonepe-upi-id@upi",
  gpay: "gpay-upi-id@upi",
  paytm: "paytm-upi-id@upi"
};

// Replace adminUPIIds by loading from Firestore when loading your menu data
const paymentButtons = document.querySelectorAll(".payment-btn");

paymentButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const method = button.getAttribute("data-method");
    const amount = parseFloat(billInput.value).toFixed(2);
    const upiId = adminUPIIds[method];
    if (!upiId || amount <= 0) {
      alert("Invalid payment details.");
      return;
    }

    // Construct UPI URI for payment
    const merchantName = encodeURIComponent(document.getElementById("restaurant-name").textContent || "Merchant");
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${merchantName}&am=${amount}&cu=INR`;

    // Try to open app using UPI URI scheme
    window.location.href = upiUri;

    // Optionally close modal after redirection
    document.getElementById("pay-bill-modal").style.display = "none";
  });
});

// Banner functionality
let currentBannerIndex = 0;
let banners = [];
let bannerInterval;

// Function to fetch banners from Firestore
async function fetchBanners() {
  try {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) return;
    
    const bannersRef = collection(db, "restaurants", restaurantId, "banners");
    const querySnapshot = await getDocs(bannersRef);
    
    banners = [];
    querySnapshot.forEach((doc) => {
      const bannerData = doc.data();
      if (bannerData.isActive) {
        banners.push({
          id: doc.id,
          ...bannerData
        });
      }
    });
    
    // Display banners if we have any
    if (banners.length > 0) {
      displayBanners();
    }
  } catch (error) {
    console.error("Error fetching banners:", error);
  }
}

// Function to display banners
function displayBanners() {
  const bannerContainer = document.getElementById('banner-container');
  const carousel = document.getElementById('banner-carousel');
  const prevBtn = document.getElementById('banner-prev');
  const nextBtn = document.getElementById('banner-next');
  const indicators = document.getElementById('banner-indicators');
  
  // Show the carousel
  carousel.style.display = 'block';
  
  // Clear existing content
  bannerContainer.innerHTML = '';
  indicators.innerHTML = '';
  
  // Create banner items
  banners.forEach((banner, index) => {
    const bannerItem = document.createElement('div');
    bannerItem.className = `banner-item ${index === 0 ? 'active' : ''}`;
    bannerItem.style.backgroundImage = `url('${banner.imageUrl}')`;
    
    if (banner.title) {
      const caption = document.createElement('div');
      caption.className = 'banner-caption';
      caption.textContent = banner.title;
      bannerItem.appendChild(caption);
    }
    
    bannerContainer.appendChild(bannerItem);
    
    // Create indicator
    const indicator = document.createElement('button');
    indicator.className = `indicator ${index === 0 ? 'active' : ''}`;
    indicator.setAttribute('data-index', index);
    indicator.addEventListener('click', () => goToBanner(index));
    indicators.appendChild(indicator);
  });
  
  // Show/hide navigation based on number of banners
  if (banners.length <= 1) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    indicators.style.display = 'none';
  } else {
    prevBtn.style.display = 'flex';
    nextBtn.style.display = 'flex';
    indicators.style.display = 'flex';
    
    // Add event listeners for navigation
    prevBtn.addEventListener('click', showPrevBanner);
    nextBtn.addEventListener('click', showNextBanner);
    
    // Start auto-rotation
    startBannerAutoRotation();
    
    // Pause auto-rotation when hovering over carousel
    carousel.addEventListener('mouseenter', () => {
      clearInterval(bannerInterval);
    });
    
    // Resume auto-rotation when not hovering
    carousel.addEventListener('mouseleave', () => {
      startBannerAutoRotation();
    });
  }
}

// Function to show a specific banner
function goToBanner(index) {
  const bannerItems = document.querySelectorAll('.banner-item');
  const indicatorItems = document.querySelectorAll('.indicator');
  
  // Remove active class from all items
  bannerItems.forEach(item => item.classList.remove('active'));
  indicatorItems.forEach(item => item.classList.remove('active'));
  
  // Add active class to selected item
  bannerItems[index].classList.add('active');
  indicatorItems[index].classList.add('active');
  
  currentBannerIndex = index;
}

// Function to show next banner
function showNextBanner() {
  let nextIndex = currentBannerIndex + 1;
  if (nextIndex >= banners.length) {
    nextIndex = 0;
  }
  goToBanner(nextIndex);
}

// Function to show previous banner
function showPrevBanner() {
  let prevIndex = currentBannerIndex - 1;
  if (prevIndex < 0) {
    prevIndex = banners.length - 1;
  }
  goToBanner(prevIndex);
}

// Function to start auto-rotation of banners
function startBannerAutoRotation() {
  if (banners.length > 1) {
    clearInterval(bannerInterval); // Clear any existing interval
    bannerInterval = setInterval(() => {
      showNextBanner();
    }, 5000); // Change banner every 5 seconds
  }
}

// Call fetchBanners when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Initialize your Firebase app first, then:
  fetchBanners();
});

function initializeFeaturedSlider() {
  const track = document.querySelector('.featured-track');
  const prevBtn = document.querySelector('.featured-section .scroll-btn.prev');
  const nextBtn = document.querySelector('.featured-section .scroll-btn.next');
  
  if (!track || !prevBtn || !nextBtn) return;
  
  let position = 0;

  function updateButtonStates() {
    prevBtn.disabled = position >= 0;
    nextBtn.disabled = position <= -(track.scrollWidth - track.clientWidth);
  }

  function slide(direction) {
    const slideAmount = 300;
    const maxPosition = -(track.scrollWidth - track.clientWidth);
    
    if (direction === 'prev') {
      position = Math.min(position + slideAmount, 0);
    } else {
      position = Math.max(position - slideAmount, maxPosition);
    }
    
    track.style.transform = `translateX(${position}px)`;
    updateButtonStates();
  }

  prevBtn.addEventListener('click', () => slide('prev'));
  nextBtn.addEventListener('click', () => slide('next'));

  // Add touch support
  let startX;
  let isDragging = false;

  track.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].pageX - position;
  });

  track.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.touches[0].pageX;
    position = x - startX;
    position = Math.max(
      Math.min(position, 0),
      -(track.scrollWidth - track.clientWidth)
    );
    track.style.transform = `translateX(${position}px)`;
  });

  track.addEventListener('touchend', () => {
    isDragging = false;
    updateButtonStates();
  });

  // Initial button state
  updateButtonStates();
}
