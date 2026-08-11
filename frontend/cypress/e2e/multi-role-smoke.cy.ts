/**
 * Multi-role web smoke checks.
 *
 * Configure role credentials via environment variables when needed:
 * - CYPRESS_smokeAdminEmail / CYPRESS_smokeAdminPassword
 * - CYPRESS_smokeInstructorEmail / CYPRESS_smokeInstructorPassword
 * - CYPRESS_smokeStudentEmail / CYPRESS_smokeStudentPassword
 * - CYPRESS_smokeCompanyAdminEmail / CYPRESS_smokeCompanyAdminPassword
 */

type Role = 'admin' | 'company_admin' | 'instructor' | 'student';

type Credentials = {
  email: string;
  password: string;
};

const WEB_BASE_URL = Cypress.env('webBaseUrl') || 'http://localhost:8081';
const API_BASE_URL = Cypress.env('apiBaseUrl') || 'http://localhost:8000';

const DEFAULT_ADMIN_EMAIL = 'mvdeventer123@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'AdminTest123!';

const credentialsByRole: Record<Role, Credentials> = {
  admin: {
    email: Cypress.env('smokeAdminEmail') || DEFAULT_ADMIN_EMAIL,
    password: Cypress.env('smokeAdminPassword') || DEFAULT_ADMIN_PASSWORD,
  },
  company_admin: {
    email:
      Cypress.env('smokeCompanyAdminEmail') || Cypress.env('smokeAdminEmail') || DEFAULT_ADMIN_EMAIL,
    password:
      Cypress.env('smokeCompanyAdminPassword') ||
      Cypress.env('smokeAdminPassword') ||
      DEFAULT_ADMIN_PASSWORD,
  },
  instructor: {
    email: Cypress.env('smokeInstructorEmail') || Cypress.env('smokeAdminEmail') || DEFAULT_ADMIN_EMAIL,
    password:
      Cypress.env('smokeInstructorPassword') ||
      Cypress.env('smokeAdminPassword') ||
      DEFAULT_ADMIN_PASSWORD,
  },
  student: {
    email: Cypress.env('smokeStudentEmail') || Cypress.env('smokeAdminEmail') || DEFAULT_ADMIN_EMAIL,
    password:
      Cypress.env('smokeStudentPassword') ||
      Cypress.env('smokeAdminPassword') ||
      DEFAULT_ADMIN_PASSWORD,
  },
};

function apiLogout() {
  return cy.request({
    method: 'POST',
    url: `${API_BASE_URL}/auth/logout`,
    failOnStatusCode: false,
  });
}

function apiLogin(role: Role, creds: Credentials) {
  return cy.request({
    method: 'POST',
    url: `${API_BASE_URL}/auth/login`,
    form: true,
    failOnStatusCode: false,
    body: {
      username: creds.email,
      password: creds.password,
      role,
      force_login: true,
    },
  });
}

function assertTabsVisible(expectedTabs: string[]) {
  expectedTabs.forEach((tab) => {
    cy.contains(tab, { matchCase: false }).should('be.visible');
  });
}

describe('Multi-role smoke routes', () => {
  beforeEach(() => {
    apiLogout();
    cy.clearCookies();
  });

  afterEach(() => {
    apiLogout();
    cy.clearCookies();
  });

  it('admin routes render key tabs', () => {
    apiLogin('admin', credentialsByRole.admin).then((response) => {
      expect(response.status, JSON.stringify(response.body)).to.eq(200);
      expect(response.body).to.have.property('access_token');
    });

    cy.visit(WEB_BASE_URL);
    cy.url({ timeout: 30000 }).should('include', '/Main/');

    assertTabsVisible(['Dashboard', 'Users', 'Bookings', 'Settings']);
    cy.contains('Admin', { matchCase: false }).should('exist');
  });

  it('instructor routes render key tabs', () => {
    apiLogin('instructor', credentialsByRole.instructor).then((response) => {
      expect(response.status, JSON.stringify(response.body)).to.eq(200);
      expect(response.body).to.have.property('access_token');
    });

    cy.visit(WEB_BASE_URL);
    cy.url({ timeout: 30000 }).should('include', '/Main/');

    assertTabsVisible(['Home', 'Schedule', 'Earnings', 'Profile']);
    cy.contains('Instructor', { matchCase: false }).should('exist');
  });

  it('student routes render key tabs', () => {
    apiLogin('student', credentialsByRole.student).then((response) => {
      expect(response.status, JSON.stringify(response.body)).to.eq(200);
      expect(response.body).to.have.property('access_token');
    });

    cy.visit(WEB_BASE_URL);
    cy.url({ timeout: 30000 }).should('include', '/Main/');

    assertTabsVisible(['Home', 'Instructors', 'Profile']);
    cy.contains('Student', { matchCase: false }).should('exist');
  });
});
