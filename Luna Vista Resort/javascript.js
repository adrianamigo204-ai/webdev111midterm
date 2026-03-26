const login = {
  loginForm: document.querySelector('#loginForm')
};

if (login.loginForm) {
  login.loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    event.preventDefault(); 
    const email = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value.trim();

    if (email && password) {
      window.location.href = "reservation.html";
    }
  });
}

const slides = document.querySelectorAll('.slide');
let currentSlide = 0;

function showSlide(index) {
  if (slides.length === 0) return;
  slides.forEach((slide, i) => {
    slide.classList.remove('active');
    if (i === index) {
      slide.classList.add('active');
    }
  });
}

function showNextSlide() {
  currentSlide = (currentSlide + 1) % slides.length;
  showSlide(currentSlide);
}

function resetTimer() {
  clearInterval(timer);
  timer = setInterval(showNextSlide, 3000);
}

let timer = setInterval(showNextSlide, 3000);

if (slides.length > 0) {
  showSlide(currentSlide);
}

function restartTimer() {
  clearInterval(timer);
  timer = setInterval(showNextSlide, 3000);
}

const reservationForm = document.querySelector('#reservationForm');

if (reservationForm) {
  reservationForm.addEventListener('submit', (event) => {
    event.preventDefault();
   
  });
}