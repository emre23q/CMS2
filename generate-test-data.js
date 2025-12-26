/**
 * Test Data Generator - FIXED VERSION
 * Run with: node generate-test-data.js > test-data.sql
 */

const NUM_CLIENTS = 100;  // Number of clients to generate
const MIN_NOTES_PER_CLIENT = 5;
const MAX_NOTES_PER_CLIENT = 25;

// Random data arrays
const firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
    'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
    'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
    'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon',
    'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
    'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen', 'Stephen', 'Anna',
    'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole', 'Brandon', 'Emma',
    'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Gregory', 'Debra',
    'Alexander', 'Rachel', 'Patrick', 'Catherine', 'Frank', 'Carolyn', 'Jack', 'Janet',
    'Dennis', 'Ruth', 'Jerry', 'Maria', 'Tyler', 'Heather', 'Aaron', 'Diane',
    'Jose', 'Virginia', 'Adam', 'Julie', 'Henry', 'Joyce', 'Nathan', 'Victoria',
    'Douglas', 'Olivia', 'Zachary', 'Kelly', 'Peter', 'Christina', 'Kyle', 'Lauren'
];

const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
    'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
    'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
    'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
    'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
    'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
    'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
    'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
    'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell'
];

const streetNames = [
    'Main St', 'Church St', 'High St', 'Station Rd', 'Park Ave', 'Victoria St',
    'King St', 'Queen St', 'George St', 'Elizabeth St', 'William St', 'Market St',
    'Oxford St', 'Crown St', 'York St', 'Pitt St', 'Sussex St', 'Kent St',
    'Liverpool St', 'Castlereagh St', 'Elizabeth Bay Rd', 'Anzac Parade', 'Parramatta Rd',
    'Broadway', 'Harris St', 'Pyrmont St', 'Glebe Point Rd', 'King St', 'Enmore Rd',
    'Bourke St', 'Collins St', 'Swanston St', 'Lonsdale St', 'La Trobe St', 'Flinders St'
];

const suburbs = [
    { name: 'Sydney', state: 'NSW', postcode: '2000' },
    { name: 'Melbourne', state: 'VIC', postcode: '3000' },
    { name: 'Brisbane', state: 'QLD', postcode: '4000' },
    { name: 'Perth', state: 'WA', postcode: '6000' },
    { name: 'Adelaide', state: 'SA', postcode: '5000' },
    { name: 'Parramatta', state: 'NSW', postcode: '2150' },
    { name: 'Newcastle', state: 'NSW', postcode: '2300' },
    { name: 'Wollongong', state: 'NSW', postcode: '2500' },
    { name: 'Geelong', state: 'VIC', postcode: '3220' },
    { name: 'Gold Coast', state: 'QLD', postcode: '4217' },
    { name: 'Canberra', state: 'ACT', postcode: '2600' },
    { name: 'Hobart', state: 'TAS', postcode: '7000' },
    { name: 'Darwin', state: 'NT', postcode: '0800' },
    { name: 'Bondi', state: 'NSW', postcode: '2026' },
    { name: 'Manly', state: 'NSW', postcode: '2095' }
];

const insuranceProviders = [
    'Bupa', 'Medibank', 'HCF', 'NIB', 'GMHBA', 'Australian Unity',
    'Teachers Health', 'HBF', 'Defence Health', 'Police Health',
    'Doctors Health Fund', 'Navy Health', 'Westfund', 'Phoenix Health'
];

const noteTypes = [
    'Initial Consultation', 'Follow-Up', 'General', 'Urgent', 'Billing',
    'Insurance Claim', 'Treatment Plan', 'Progress Report', 'Referral',
    'Prescription', 'Test Results', 'Phone Call', 'Email Correspondence'
];

// EXPANDED note templates with more content
const noteSentences = [
    'Client presented today for scheduled appointment.',
    'Comprehensive health assessment was completed during this visit.',
    'Patient reports feeling generally well with some minor concerns.',
    'Vital signs were taken and recorded in the system.',
    'Blood pressure reading was within acceptable range for patient age.',
    'Weight and BMI measurements updated in medical records.',
    'Patient expressed concerns about recent symptoms and discomfort.',
    'Detailed discussion held regarding treatment options and next steps.',
    'Patient demonstrates good understanding of their condition.',
    'Medication compliance has been excellent according to patient report.',
    'Recent lab work shows improvement in key health markers.',
    'Patient was counseled on lifestyle modifications and dietary changes.',
    'Exercise recommendations provided and documented.',
    'Sleep patterns and quality discussed in detail.',
    'Stress management techniques reviewed with patient.',
    'Patient reports improved quality of life since last visit.',
    'Family medical history was reviewed and updated.',
    'Current medications list verified and updated in system.',
    'Allergies and adverse reactions confirmed with patient.',
    'Follow-up appointment scheduled for continued monitoring.',
    'Patient instructed to contact office if symptoms worsen.',
    'Educational materials provided regarding condition management.',
    'Insurance coverage and billing questions addressed.',
    'Referral paperwork completed for specialist consultation.',
    'Patient expressed satisfaction with current care plan.',
    'Laboratory test results reviewed with patient in detail.',
    'Imaging studies show no significant changes from previous.',
    'Patient demonstrates good adherence to recommended protocols.',
    'Pain levels assessed using standardized pain scale.',
    'Mobility and functional status evaluated and documented.',
    'Patient reports manageable side effects from current medication.',
    'Dosage adjustments made based on patient response.',
    'Alternative treatment options discussed as backup plan.',
    'Patient agrees to continue with current treatment approach.',
    'Emergency contact information verified and updated.',
    'Advanced directive documentation reviewed with patient.',
    'Preventive care screenings discussed and scheduled.',
    'Vaccination status reviewed and updated as appropriate.',
    'Patient educated on warning signs requiring immediate attention.',
    'Care coordination with other providers documented.',
];

const symptoms = [
    'mild headaches', 'persistent cough', 'lower back pain', 'fatigue',
    'joint stiffness', 'difficulty sleeping', 'digestive issues', 'muscle tension',
    'shortness of breath', 'dizziness', 'chest discomfort', 'anxiety symptoms',
    'neck pain', 'knee pain', 'shoulder discomfort', 'numbness in extremities'
];

const conditions = [
    'hypertension', 'diabetes type 2', 'chronic pain syndrome', 'osteoarthritis',
    'asthma', 'chronic migraines', 'generalized anxiety disorder', 'major depression',
    'hyperlipidemia', 'hypothyroidism', 'obstructive sleep apnea', 'GERD',
    'fibromyalgia', 'rheumatoid arthritis', 'chronic fatigue syndrome'
];

const progress = ['significant', 'moderate', 'gradual', 'excellent', 'steady', 'marked', 'noticeable', 'substantial'];
const areas = ['mobility', 'pain management', 'overall wellbeing', 'symptom control', 'functional capacity', 'daily activities'];
const medications = ['prescribed medication', 'beta blockers', 'ACE inhibitors', 'SSRIs', 'anti-inflammatory medication', 'pain management medication'];

// Helper functions
function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatDateTime(date) {
    return date.toISOString().replace('T', ' ').split('.')[0];
}

function generateEmail(firstName, lastName) {
    const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'email.com', 'mail.com', 'icloud.com'];
    const separators = ['', '.', '_'];
    const sep = random(separators);
    return `${firstName.toLowerCase()}${sep}${lastName.toLowerCase()}@${random(domains)}`;
}

function generatePhone() {
    return `04${randomInt(10000000, 99999999)}`;
}

function generateAddress() {
    const streetNum = randomInt(1, 999);
    const street = random(streetNames);
    const suburb = random(suburbs);
    return `${streetNum} ${street}, ${suburb.name} ${suburb.state} ${suburb.postcode}`;
}

function generateDOB() {
    const start = new Date(1940, 0, 1);
    const end = new Date(2005, 11, 31);
    return formatDate(randomDate(start, end));
}

function generateClientSince() {
    const start = new Date(2020, 0, 1);
    const end = new Date(2024, 11, 26);
    return formatDate(randomDate(start, end));
}

function generateLongNoteContent() {
    // Generate 3-8 sentences for each note
    const numSentences = randomInt(3, 8);
    const sentences = [];
    
    for (let i = 0; i < numSentences; i++) {
        let sentence = random(noteSentences);
        
        // Randomly add specific details
        if (Math.random() > 0.7) {
            sentence = sentence.replace('symptoms', random(symptoms));
            sentence = sentence.replace('condition', random(conditions));
            sentence = sentence.replace('medication', random(medications));
        }
        
        sentences.push(sentence);
    }
    
    // Add some variety with medical details
    if (Math.random() > 0.5) {
        sentences.push(`Patient reports ${random(progress)} improvement in ${random(areas)}.`);
    }
    
    if (Math.random() > 0.6) {
        sentences.push(`Currently managing ${random(conditions)} with good compliance to treatment plan.`);
    }
    
    if (Math.random() > 0.7) {
        sentences.push(`No adverse effects reported with current ${random(medications)} regimen.`);
    }
    
    return sentences.join(' ');
}

function escapeSQL(str) {
    return str.replace(/'/g, "''");
}

// Generate SQL
console.log('-- Generated Test Data');
console.log('-- ' + NUM_CLIENTS + ' clients with ' + MIN_NOTES_PER_CLIENT + '-' + MAX_NOTES_PER_CLIENT + ' notes each');
console.log('');
console.log('PRAGMA foreign_keys = OFF;');
console.log('');

// Generate clients
console.log('-- Insert Clients');
console.log('INSERT INTO Client (firstName, lastName, dob, gender, email, phone, address, insurance, clientSince) VALUES');

const clients = [];
for (let i = 0; i < NUM_CLIENTS; i++) {
    const firstName = random(firstNames);
    const lastName = random(lastNames);
    const gender = random(['Male', 'Female', 'Other']);
    const email = generateEmail(firstName, lastName);
    const phone = generatePhone();
    const address = generateAddress();
    const insurance = random(insuranceProviders);
    const dob = generateDOB();
    const clientSince = generateClientSince();
    
    clients.push({
        id: i + 1,
        firstName,
        lastName,
        clientSince: new Date(clientSince)
    });
    
    const values = `('${escapeSQL(firstName)}', '${escapeSQL(lastName)}', '${dob}', '${gender}', '${escapeSQL(email)}', '${phone}', '${escapeSQL(address)}', '${escapeSQL(insurance)}', '${clientSince}')`;
    
    if (i === NUM_CLIENTS - 1) {
        console.log(values + ';');
    } else {
        console.log(values + ',');
    }
}

console.log('');
console.log('-- Insert Notes');
console.log('INSERT INTO History (clientID, createdOn, noteType, content) VALUES');

// Generate notes with proper tracking
let isFirstNote = true;

clients.forEach((client, clientIndex) => {
    const numNotes = randomInt(MIN_NOTES_PER_CLIENT, MAX_NOTES_PER_CLIENT);
    
    for (let i = 0; i < numNotes; i++) {
        // Generate dates between client's clientSince and now
        const start = client.clientSince;
        const end = new Date();
        const noteDate = formatDateTime(randomDate(start, end));
        
        const noteType = random(noteTypes);
        const content = generateLongNoteContent();
        
        const values = `(${client.id}, '${noteDate}', '${escapeSQL(noteType)}', '${escapeSQL(content)}')`;
        
        // Determine if this is the very last note
        const isLastClient = clientIndex === clients.length - 1;
        const isLastNote = i === numNotes - 1;
        const isVeryLastNote = isLastClient && isLastNote;
        
        if (!isFirstNote) {
            console.log(',');
        }
        process.stdout.write(values);
        
        if (isVeryLastNote) {
            console.log(';');
        }
        
        isFirstNote = false;
    }
});

console.log('');
console.log('PRAGMA foreign_keys = ON;');
console.log('');
console.log('-- Stats:');
console.log('-- Clients: ' + NUM_CLIENTS);