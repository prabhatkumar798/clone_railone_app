/**
 * RailOne UTS Clone - App Core Logic
 */

// ==========================================
// 1. STATIONS & DISTANCE MATRIX (KM)
// ==========================================
const STATION_KM = {
  // Harbour Line
  'CSMT': 0, 'C SHIVAJI MAH T': 0, 'MASJID': 2, 'SANDHURST ROAD': 3,
  'DOCKYARD ROAD': 4, 'REAY ROAD': 5, 'COTTON GREEN': 6, 'SEWRI': 7,
  'VADALA ROAD': 9, 'GTB NAGAR': 12, 'CHUNABHATTI': 14, 'KURLA': 15,
  'TILAK NAGAR': 17, 'CHEMBUR': 18, 'GOVANDI': 20, 'MANKHURD': 22,
  'VASHI': 29, 'SANPADA': 31, 'JUINAGAR': 33, 'NERUL': 35,
  'SEAWOODS': 37, 'BELAPUR': 40, 'BELAPUR C.B.D': 40, 'KHARGHAR': 43,
  'KHAG': 43, 'MANSAROVAR': 46, 'KHANDESHWAR': 48, 'PANVEL': 52,

  // Central Line
  'BYCULLA': 4, 'DADAR': 9, 'MATUNGA': 11, 'SION': 13,
  'GHATKOPAR': 19, 'VIKHROLI': 23, 'THANE': 34, 'DOMBIVLI': 49, 'KALYAN': 54,

  // Western Line
  'CHURCHGATE': 0, 'MUMBAI CENTRAL': 4, 'MMCT': 4, 'BANDRA': 15,
  'ANDHERI': 23, 'BORIVALI': 35, 'VIRAR': 64
};

function getDistanceBetween(source, dest) {
  const srcUpper = (source || '').toUpperCase();
  const destUpper = (dest || '').toUpperCase();

  const sKey = Object.keys(STATION_KM).find(k => srcUpper.includes(k));
  const dKey = Object.keys(STATION_KM).find(k => destUpper.includes(k));

  if (sKey && dKey) {
    const diff = Math.abs(STATION_KM[sKey] - STATION_KM[dKey]);
    return diff === 0 ? 3 : diff;
  }
  return 15; // default fallback distance
}

// ==========================================
// 2. STATE & LOCAL STORAGE
// ==========================================
const STORAGE_KEYS = {
  USER_DATA: 'railone_user_profile',
  WALLET_BAL: 'railone_wallet_balance',
  BOOKINGS: 'railone_booking_history',
};

let isManualFareOverridden = false;

let appState = {
  user: {
    fullName: 'PRABHAT KUMAR SAW',
    age: 18,
    gender: 'M',
    diet: 'Veg',
  },
  walletBalance: 16.65,
  currentFare: 10.0,
  activeBookingType: 'unreserved', // 'unreserved', 'reserved', 'platform'
  activeBookingConfig: {
    source: 'KHARGHAR (KHAG)',
    destination: 'C SHIVAJI MAH T (CSMT)',
    trainType: 'ORDINARY',
    ticketType: 'JOURNEY',
    classType: 'SECOND',
    adults: 1,
    children: 0,
    distanceKm: 38,
    quota: 'General',
    departureDate: 'Mon, 19 Oct',
    personsCount: 1,
  },
  activeCountdownTimer: null,
  remainingSeconds: 300,
  bookings: [
    {
      id: 'R17923',
      utsCode: 'X0HHEHB0F8',
      category: 'Unreserved',
      source: 'KHARGHAR',
      dest: 'BELAPUR C.B.D',
      distance: '3 km',
      passengers: '1 Adult, 0 Child',
      ticketType: 'JOURNEY',
      trainType: 'ORDINARY',
      classType: 'SECOND',
      fare: 5.0,
      bookingTime: '19 Oct 2026, 13:04',
      status: 'Upcoming',
    },
    {
      id: '8153388346',
      utsCode: '12322 (KOLKATA MAIL)',
      category: 'Reserved',
      source: 'C SHIVAJI MAH T',
      dest: 'KODERMA JN',
      distance: '29h:13m',
      passengers: '1 Adult',
      ticketType: 'JOURNEY',
      trainType: 'EXPRESS',
      classType: 'SL',
      fare: 580.0,
      bookingTime: 'Sun, 8 Nov 2026',
      status: 'Upcoming',
    },
    {
      id: 'R10291',
      utsCode: 'X0KDEEZ09E',
      category: 'Unreserved',
      source: 'KHANDESHWAR',
      dest: 'BELAPUR C.B.D',
      distance: '8 km',
      passengers: '1 Adult, 0 Child',
      ticketType: 'JOURNEY',
      trainType: 'ORDINARY',
      classType: 'SECOND',
      fare: 5.0,
      bookingTime: 'Mon, 27 Jul 2026',
      status: 'Completed',
    },
  ],
};

// ==========================================
// 3. INITIALIZATION & LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  recomputeFare();
  renderUpcomingWidget();
  renderBookingsList('Upcoming');

  // Direct Tap to Edit Fare Listener
  const fareInput = document.getElementById('editableFareValue');
  if (fareInput) {
    fareInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        appState.currentFare = Math.round(val);
        isManualFareOverridden = true; // Lock user's manual value
      }
    });

    fareInput.addEventListener('focus', () => {
      fareInput.select(); // Tap karte hi pura select hoga edit ke liye
    });
  }
});

function initStorage() {
  const savedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
  const savedWallet = localStorage.getItem(STORAGE_KEYS.WALLET_BAL);
  const savedBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);

  if (savedUser) {
    appState.user = JSON.parse(savedUser);
  } else {
    openOnboardingModal();
  }

  if (savedWallet !== null) {
    appState.walletBalance = parseFloat(savedWallet);
  }

  if (savedBookings) {
    appState.bookings = JSON.parse(savedBookings);
  }

  syncProfileUI();
}

// ==========================================
// 4. NAVIGATION
// ==========================================
function navigateTo(targetScreenId) {
  document.querySelectorAll('.screen').forEach(scr => scr.classList.remove('active'));

  const target = document.getElementById(targetScreenId);
  if (target) {
    target.classList.add('active');
  }

  const bottomNav = document.getElementById('bottomNavBar');
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

  if (targetScreenId === 'screen-home') {
    bottomNav.style.display = 'flex';
    document.getElementById('nav-home')?.classList.add('active');
  } else if (targetScreenId === 'screen-bookings') {
    bottomNav.style.display = 'flex';
    document.getElementById('nav-bookings')?.classList.add('active');
    renderBookingsList('Upcoming');
  } else if (targetScreenId === 'screen-you') {
    bottomNav.style.display = 'flex';
    document.getElementById('nav-you')?.classList.add('active');
  } else {
    bottomNav.style.display = 'none';
  }
}

// ==========================================
// 5. PROFILE & WALLET
// ==========================================
function openOnboardingModal() {
  const modal = document.getElementById('modalOnboarding');
  if (modal) {
    modal.classList.add('open');
    document.getElementById('setupFullName').value = appState.user.fullName || '';
    document.getElementById('setupAge').value = appState.user.age || 18;
    document.getElementById('setupGender').value = appState.user.gender || 'M';
    document.getElementById('setupInitialWallet').value = appState.walletBalance || 16.65;
  }
}

function openEditDetailsModal() {
  openOnboardingModal();
}

function saveUserDetails(e) {
  e.preventDefault();
  const name = document.getElementById('setupFullName').value.trim() || 'PRABHAT KUMAR SAW';
  const age = parseInt(document.getElementById('setupAge').value, 10) || 18;
  const gender = document.getElementById('setupGender').value || 'M';
  const initBal = parseFloat(document.getElementById('setupInitialWallet').value) || 0;

  appState.user = { fullName: name, age: age, gender: gender, diet: 'Veg' };
  appState.walletBalance = initBal;

  localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(appState.user));
  localStorage.setItem(STORAGE_KEYS.WALLET_BAL, appState.walletBalance.toString());

  document.getElementById('modalOnboarding').classList.remove('open');
  syncProfileUI();
}

function syncProfileUI() {
  const name = appState.user.fullName;
  document.getElementById('displayGreetingName').textContent = name;
  document.getElementById('youProfileName').textContent = name;
  document.getElementById('savedPassName').textContent = name;
  document.getElementById('drawerUserName').textContent = name;

  const metaStr = `${appState.user.age} Y, ${appState.user.gender}, NC | ${appState.user.diet} `;
  document.getElementById('savedPassDetails').innerHTML = `${metaStr} <i class="fa-solid fa-circle-check veg-check"></i>`;

  const formattedBal = `₹ ${appState.walletBalance.toFixed(2)}`;
  document.getElementById('youWalletDisplay').textContent = formattedBal;
  document.getElementById('drawerWalletDisplay').textContent = formattedBal;
  document.getElementById('paymentWalletBalance').textContent = formattedBal;
}

function openAddMoneyModal() {
  const modal = document.getElementById('modalAddMoney');
  if (modal) {
    document.getElementById('modalCurrentWalletBal').textContent = `₹ ${appState.walletBalance.toFixed(2)}`;
    document.getElementById('addMoneyAmount').value = '';
    modal.classList.add('open');
  }
}

function closeAddMoneyModal() {
  document.getElementById('modalAddMoney').classList.remove('open');
}

function setQuickAdd(amount) {
  document.getElementById('addMoneyAmount').value = amount;
}

function confirmAddMoney() {
  const amtInput = document.getElementById('addMoneyAmount');
  const amountToAdd = parseFloat(amtInput.value);

  if (isNaN(amountToAdd) || amountToAdd <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  appState.walletBalance += amountToAdd;
  localStorage.setItem(STORAGE_KEYS.WALLET_BAL, appState.walletBalance.toString());

  syncProfileUI();
  closeAddMoneyModal();
  checkBalanceAlert();

  alert(`₹${amountToAdd.toFixed(2)} added to R-Wallet!`);
}

function syncWallet() {
  syncProfileUI();
}

// ==========================================
// 6. FARE COMPUTATION ENGINE
// ==========================================
function recomputeFare() {
  if (isManualFareOverridden) {
    return; // User dwara type kiya gaya number protect rahega
  }

  const { adults, children, trainType, ticketType, classType, source, destination } = appState.activeBookingConfig;

  const distance = getDistanceBetween(source, destination);
  appState.activeBookingConfig.distanceKm = distance;

  let singleAdultFare = 5;
  if (distance > 5 && distance <= 10) singleAdultFare = 10;
  else if (distance > 10 && distance <= 25) singleAdultFare = 15;
  else if (distance > 25 && distance <= 45) singleAdultFare = 20;
  else if (distance > 45 && distance <= 70) singleAdultFare = 25;
  else if (distance > 70) singleAdultFare = 30 + Math.floor((distance - 70) / 15) * 5;

  if (classType === 'FIRST') singleAdultFare *= 6;
  if (trainType === 'AC EMU TRAIN') singleAdultFare = Math.max(35, singleAdultFare * 7);

  let total = (adults * singleAdultFare) + (children * Math.ceil(singleAdultFare / 2));
  if (ticketType === 'RETURN') total *= 2;

  total = Math.round(total);
  appState.currentFare = total;

  const fareInput = document.getElementById('editableFareValue');
  if (fareInput) {
    fareInput.value = total;
  }
}

// ==========================================
// 7. BOOKING FUNNELS
// ==========================================
function toggleSearchTab(tab) {
  const tabNormal = document.getElementById('tabNormal');
  const tabSeason = document.getElementById('tabSeason');
  const normalRow = document.getElementById('normalToggleRow');
  const seasonPanel = document.getElementById('seasonSubPanel');

  if (tab === 'season') {
    tabSeason.classList.add('active');
    tabNormal.classList.remove('active');
    normalRow.style.display = 'none';
    seasonPanel.style.display = 'block';
  } else {
    tabNormal.classList.add('active');
    tabSeason.classList.remove('active');
    normalRow.style.display = 'flex';
    seasonPanel.style.display = 'none';
  }
}

function swapStations() {
  const src = document.getElementById('inputSourceStation');
  const dst = document.getElementById('inputDestStation');
  const tmp = src.value;
  src.value = dst.value;
  dst.value = tmp;
}

function applyRecent(src, dest) {
  document.getElementById('inputSourceStation').value = src;
  document.getElementById('inputDestStation').value = dest;
}

function goToPassengerDetails() {
  appState.activeBookingType = 'unreserved';
  const src = document.getElementById('inputSourceStation').value.trim();
  const dest = document.getElementById('inputDestStation').value.trim();

  if (!src || !dest) {
    alert('Please enter stations');
    return;
  }

  appState.activeBookingConfig.source = src;
  appState.activeBookingConfig.destination = dest;

  document.getElementById('passScreenSource').textContent = src.split('(')[0].trim();
  document.getElementById('passScreenDest').textContent = dest.split('(')[0].trim();

  isManualFareOverridden = false; // Reset override on new search
  recomputeFare();
  navigateTo('screen-passenger-details');
}

function setTrainType(type) {
  appState.activeBookingConfig.trainType = type;
  document.getElementById('trainOrdinary').classList.toggle('active', type === 'ORDINARY');
  document.getElementById('trainAc').classList.toggle('active', type === 'AC EMU TRAIN');
  recomputeFare();
}

function setTicketType(type) {
  appState.activeBookingConfig.ticketType = type;
  document.getElementById('ticketJourney').classList.toggle('active', type === 'JOURNEY');
  document.getElementById('ticketReturn').classList.toggle('active', type === 'RETURN');
  recomputeFare();
}

function setClassType(cls) {
  appState.activeBookingConfig.classType = cls;
  document.getElementById('classSecond').classList.toggle('active', cls === 'SECOND');
  document.getElementById('classFirst').classList.toggle('active', cls === 'FIRST');
  recomputeFare();
}

function changeCount(type, delta) {
  if (type === 'adult') {
    let current = appState.activeBookingConfig.adults + delta;
    if (current < 1) current = 1;
    if (current > 4) current = 4;
    appState.activeBookingConfig.adults = current;
    document.getElementById('adultCount').textContent = current;
  } else {
    let current = appState.activeBookingConfig.children + delta;
    if (current < 0) current = 0;
    if (current > 4) current = 4;
    appState.activeBookingConfig.children = current;
    document.getElementById('childCount').textContent = current;
  }
  recomputeFare();
}

// Reserved & Platform functions
function swapResStations() {
  const src = document.getElementById('inputResSource');
  const dst = document.getElementById('inputResDest');
  const tmp = src.value;
  src.value = dst.value;
  dst.value = tmp;
}

function selectResDate(btn, date) {
  document.querySelectorAll('.date-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  appState.activeBookingConfig.departureDate = date;
}

function selectResClass(btn, cls) {
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  appState.activeBookingConfig.classType = cls;
}

function applyFavJourney() {
  document.getElementById('inputResSource').value = 'KQR - KODERMA JN';
  document.getElementById('inputResDest').value = 'CSMT - C SHIVAJI MAH T';
}

function proceedToReservedBooking() {
  appState.activeBookingType = 'reserved';
  appState.activeBookingConfig.source = document.getElementById('inputResSource').value;
  appState.activeBookingConfig.destination = document.getElementById('inputResDest').value;
  appState.activeBookingConfig.quota = document.getElementById('resQuotaSelect').value;
  appState.currentFare = 450.0;
  proceedToPayment();
}

function changePlatformPersons(delta) {
  let count = appState.activeBookingConfig.personsCount + delta;
  if (count < 1) count = 1;
  if (count > 6) count = 6;
  appState.activeBookingConfig.personsCount = count;
  
  document.getElementById('platformPersonCount').textContent = count;
  const fare = count * 10.0;
  document.getElementById('platformFareDisplay').textContent = `₹ ${fare.toFixed(1)}`;
  document.getElementById('btnPlatformPay').textContent = `Pay ₹ ${fare.toFixed(1)}`;
}

function proceedPlatformPayment() {
  appState.activeBookingType = 'platform';
  appState.activeBookingConfig.source = document.getElementById('inputPlatformStation').value;
  appState.activeBookingConfig.destination = 'Platform Entry';
  appState.currentFare = appState.activeBookingConfig.personsCount * 10.0;
  proceedToPayment();
}

// ==========================================
// 8. PAYMENT & TICKET ISSUANCE (20 MIN BACK)
// ==========================================
function proceedToPayment() {
  document.getElementById('paymentRouteSnippet').textContent =
    `${appState.activeBookingConfig.source.split(' ')[0]} ➔ ${appState.activeBookingConfig.destination.split(' ')[0]}`;

  const due = `Pay ₹ ${appState.currentFare}`;
  document.getElementById('paymentDueSnippet').textContent = due;
  document.getElementById('btnConfirmPay').textContent = `${due} Now`;

  checkBalanceAlert();
  navigateTo('screen-payment');
}

function handlePaymentBack() {
  if (appState.activeBookingType === 'reserved') {
    navigateTo('screen-reserved-search');
  } else if (appState.activeBookingType === 'platform') {
    navigateTo('screen-platform-booking');
  } else {
    navigateTo('screen-passenger-details');
  }
}

function checkBalanceAlert() {
  const alertEl = document.getElementById('insufficientAlert');
  if (appState.walletBalance < appState.currentFare) {
    alertEl.style.display = 'block';
  } else {
    alertEl.style.display = 'none';
  }
}

function selectPaymentMethod(method) {
  if (method === 'wallet' && appState.walletBalance < appState.currentFare) {
    alert('Insufficient Wallet Balance. Please add money.');
    return;
  }
  executePayment(method);
}

function executePayment(method = 'wallet') {
  if (method === 'wallet') {
    if (appState.walletBalance < appState.currentFare) {
      alert(`Insufficient balance! Please add ₹${(appState.currentFare - appState.walletBalance).toFixed(2)} or select UPI.`);
      return;
    }
    appState.walletBalance -= appState.currentFare;
    localStorage.setItem(STORAGE_KEYS.WALLET_BAL, appState.walletBalance.toString());
  }

  // Current time se theek 20 minute peeche ka time
  const now = new Date();
  const bookingTimeObj = new Date(now.getTime() - 20 * 60 * 1000);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = bookingTimeObj.getDate();
  const month = months[bookingTimeObj.getMonth()];
  const year = bookingTimeObj.getFullYear();
  const hours = String(bookingTimeObj.getHours()).padStart(2, '0');
  const minutes = String(bookingTimeObj.getMinutes()).padStart(2, '0');

  const dateFormatted = `${day} ${month} ${year}, ${hours}:${minutes}`;

  const randomUts = 'X0' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const randomRef = 'R' + Math.floor(10000 + Math.random() * 90000);

  let categoryLabel = 'Unreserved';
  let passengersText = `${appState.activeBookingConfig.adults} Adult, ${appState.activeBookingConfig.children} Child`;

  if (appState.activeBookingType === 'reserved') {
    categoryLabel = 'Reserved';
    passengersText = '1 Adult';
  } else if (appState.activeBookingType === 'platform') {
    categoryLabel = 'Platform';
    passengersText = `${appState.activeBookingConfig.personsCount} Person(s)`;
  }

  const newTicket = {
    id: randomRef,
    utsCode: randomUts,
    category: categoryLabel,
    source: appState.activeBookingConfig.source.split('(')[0].trim(),
    dest: appState.activeBookingConfig.destination.split('(')[0].trim(),
    distance: appState.activeBookingType === 'platform' ? 'Platform' : `${appState.activeBookingConfig.distanceKm} km`,
    passengers: passengersText,
    ticketType: appState.activeBookingType === 'platform' ? 'PLATFORM' : appState.activeBookingConfig.ticketType,
    trainType: appState.activeBookingType === 'reserved' ? 'SUPERFAST' : appState.activeBookingConfig.trainType,
    classType: appState.activeBookingConfig.classType,
    fare: appState.currentFare,
    bookingTime: dateFormatted,
    status: 'Upcoming',
  };

  appState.bookings.unshift(newTicket);
  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(appState.bookings));

  syncProfileUI();
  renderUpcomingWidget();
  showDynamicTicketView(newTicket);
}

// ==========================================
// 9. DYNAMIC VIEW & 5-MIN COUNTDOWN
// ==========================================
function showDynamicTicketView(ticket) {
  document.getElementById('ticketGreetingText').textContent =
    `Thank You ${appState.user.fullName}, Happy Journey !`;

  document.getElementById('ticketBookingTime').textContent = ticket.bookingTime;
  document.getElementById('ticketUtsRef').textContent = ticket.id;
  document.getElementById('ticketUtsCode').textContent = ticket.utsCode;
  document.getElementById('ticketSourceVal').textContent = ticket.source;
  document.getElementById('ticketDestVal').textContent = ticket.dest;
  document.getElementById('ticketDistanceVal').textContent = ticket.distance;
  document.getElementById('ticketPassengersVal').textContent = ticket.passengers;
  document.getElementById('ticketTypeVal').textContent = ticket.ticketType;
  document.getElementById('ticketTrainVal').textContent = ticket.trainType;
  document.getElementById('ticketClassVal').textContent = ticket.classType;
  document.getElementById('ticketFareVal').textContent = `₹${ticket.fare.toFixed(2)}`;

  const qrData = encodeURIComponent(`UTS_TICKET|ID:${ticket.id}|UTS:${ticket.utsCode}|FROM:${ticket.source}|TO:${ticket.dest}|FARE:${ticket.fare}`);
  document.getElementById('ticketQrImage').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrData}`;

  startFiveMinuteCountdown();
  navigateTo('screen-ticket-view');
}

function startFiveMinuteCountdown() {
  if (appState.activeCountdownTimer) {
    clearInterval(appState.activeCountdownTimer);
  }

  appState.remainingSeconds = 300;
  const timerDisplay = document.getElementById('dynamicTimerDisplay');

  function renderClock() {
    const mins = Math.floor(appState.remainingSeconds / 60);
    const secs = appState.remainingSeconds % 60;
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  renderClock();

  appState.activeCountdownTimer = setInterval(() => {
    appState.remainingSeconds -= 1;
    if (appState.remainingSeconds < 0) {
      clearInterval(appState.activeCountdownTimer);
      timerDisplay.textContent = '00:00';
    } else {
      renderClock();
    }
  }, 1000);
}

// ==========================================
// 10. TICKET RENDERERS & BOOKINGS TAB
// ==========================================
function createTicketCardHTML(ticket, isPurpleUpcoming = false) {
  const cardClass = isPurpleUpcoming
    ? 'ticket-cutout-card purple-gradient'
    : 'ticket-cutout-card';

  const badgeClass = ticket.category === 'Reserved' ? 'badge-tag reserved' : 'badge-tag';

  return `
    <div class="${cardClass}">
      <div class="ticket-top-row">
        <span class="${badgeClass}">${ticket.category || 'Unreserved'}</span>
        <span class="uts-ref">UTS: ${ticket.utsCode}</span>
      </div>

      <div class="route-line-info">
        <small style="font-size: 11px; opacity: 0.8;">Ticket: ${ticket.ticketType} &bull; Booking: ${ticket.bookingTime}</small>
      </div>

      <div class="ticket-route-line" style="margin-top: 6px;">
        <span>${ticket.source}</span>
        <span class="route-distance-chip">— ${ticket.distance} —</span>
        <span>${ticket.dest}</span>
      </div>

      <div class="ticket-perforated-divider"></div>

      <div class="ticket-actions-bar">
        <button class="btn-card-action" onclick="rebookTicket('${ticket.source}', '${ticket.dest}', '${ticket.category}')">Book Again</button>
        <span style="opacity: 0.4;">|</span>
        <button class="btn-card-action" onclick="openSavedTicketDetails('${ticket.id}')">View Details</button>
      </div>
    </div>
  `;
}

function renderUpcomingWidget() {
  const container = document.getElementById('homeUpcomingContainer');
  const upcomingTicket = appState.bookings.find(t => t.status === 'Upcoming');

  if (!upcomingTicket) {
    container.innerHTML = `
      <div style="background: #fff; padding: 18px; border-radius: 14px; text-align: center; color: #94a3b8; font-size: 13px;">
        No active journey. Book a ticket above.
      </div>`;
    return;
  }

  container.innerHTML = createTicketCardHTML(upcomingTicket, true);
}

function renderBookingsList(activeFilter = 'Upcoming') {
  const listContainer = document.getElementById('bookingsTicketList');
  if (!listContainer) return;

  const filtered = appState.bookings.filter(t => {
    if (activeFilter === 'All') return true;
    return t.status === activeFilter;
  });

  const countUpcoming = appState.bookings.filter(t => t.status === 'Upcoming').length;
  const countCompleted = appState.bookings.filter(t => t.status === 'Completed').length;

  document.getElementById('countUpcoming').textContent = countUpcoming;
  document.getElementById('countCompleted').textContent = countCompleted;

  if (activeFilter === 'Cancelled' || filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state-box">
        <i class="fa-solid fa-ticket-simple"></i>
        <h4>No Tickets Found. Swipe down to refresh.</h4>
      </div>`;
    return;
  }

  listContainer.innerHTML = filtered.map(t => createTicketCardHTML(t, false)).join('');
}

function filterBookingsTab(tabName) {
  document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`filter${tabName}`);
  if (btn) btn.classList.add('active');
  renderBookingsList(tabName);
}

function openSavedTicketDetails(ticketId) {
  const ticket = appState.bookings.find(t => t.id === ticketId);
  if (ticket) {
    showDynamicTicketView(ticket);
  }
}

function rebookTicket(src, dest, category) {
  if (category === 'Reserved') {
    document.getElementById('inputResSource').value = src;
    document.getElementById('inputResDest').value = dest;
    navigateTo('screen-reserved-search');
  } else if (category === 'Platform') {
    document.getElementById('inputPlatformStation').value = src;
    navigateTo('screen-platform-booking');
  } else {
    document.getElementById('inputSourceStation').value = src;
    document.getElementById('inputDestStation').value = dest;
    navigateTo('screen-unreserved-search');
  }
}

// ==========================================
// 11. SIDE DRAWER MENU
// ==========================================
function openDrawer() {
  document.getElementById('drawerOverlay').style.display = 'block';
  document.getElementById('sideDrawer').classList.add('open');
}

function closeDrawer() {
  document.getElementById('drawerOverlay').style.display = 'none';
  document.getElementById('sideDrawer').classList.remove('open');
}

function resetAppData() {
  if (confirm('Are you sure you want to log out and reset local data?')) {
    localStorage.clear();
    location.reload();
  }
}