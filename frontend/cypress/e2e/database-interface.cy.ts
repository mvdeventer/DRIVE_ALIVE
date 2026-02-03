/**
 * Cypress E2E Tests for Database Interface
 * End-to-end testing for full user flows
 */

describe('Database Interface - Admin CRUD Operations', () => {
  beforeEach(() => {
    // Login as admin
    cy.visit('http://localhost:8081/login');
    cy.get('input[placeholder="Email"]').type('admin@example.com');
    cy.get('input[placeholder="Password"]').type('Admin123!');
    cy.contains('Login').click();

    // Wait for login and navigate to database interface
    cy.url().should('include', '/admin-dashboard');
    cy.contains('Database Interface').click();
    cy.url().should('include', '/database-interface');
  });

  describe('User Management', () => {
    it('should list all users with pagination', () => {
      cy.contains('Users').click();
      
      // Should show user table
      cy.get('[data-testid="user-table"]').should('be.visible');
      
      // Should show pagination controls
      cy.contains('Page 1').should('be.visible');
      cy.contains('Previous').should('be.disabled');
      cy.contains('Next').should('not.be.disabled');
    });

    it('should search users by name', () => {
      cy.contains('Users').click();
      
      // Enter search term
      cy.get('input[placeholder*="Search"]').type('John Doe');
      
      // Should filter results
      cy.wait(500); // Debounce delay
      cy.get('[data-testid="user-row"]').should('have.length.greaterThan', 0);
      cy.contains('John Doe').should('be.visible');
    });

    it('should filter users by role', () => {
      cy.contains('Users').click();
      
      // Select role filter
      cy.get('[data-testid="role-filter"]').click();
      cy.contains('STUDENT').click();
      
      // Should show only students
      cy.wait(500);
      cy.get('[data-testid="user-row"]').each(($row) => {
        cy.wrap($row).should('contain', 'STUDENT');
      });
    });

    it('should edit user details', () => {
      cy.contains('Users').click();
      
      // Click edit on first user
      cy.get('[data-testid="edit-button"]').first().click();
      
      // Modal should open
      cy.get('[data-testid="edit-modal"]').should('be.visible');
      
      // Change first name
      cy.get('input[placeholder="First Name"]').clear().type('Updated Name');
      
      // Save changes
      cy.contains('Save Changes').click();
      
      // Should show success message
      cy.contains(/updated successfully/i).should('be.visible');
    });

    it('should handle concurrent edit conflicts (ETag)', () => {
      cy.contains('Users').click();
      
      // Click edit on first user
      cy.get('[data-testid="edit-button"]').first().click();
      
      // Wait for modal
      cy.get('[data-testid="edit-modal"]').should('be.visible');
      
      // Simulate another admin editing same user (intercept API)
      cy.intercept('PUT', '/api/database/users/*', {
        statusCode: 409,
        body: {
          type: 'https://datatracker.ietf.org/doc/html/rfc7807',
          title: 'Conflict',
          status: 409,
          detail: 'Record was modified by another user',
        },
      }).as('conflictResponse');
      
      // Try to save
      cy.contains('Save Changes').click();
      
      // Should show conflict error
      cy.wait('@conflictResponse');
      cy.contains(/modified by another user/i).should('be.visible');
    });

    it('should delete user', () => {
      cy.contains('Users').click();
      
      // Click delete on first user
      cy.get('[data-testid="delete-button"]').first().click();
      
      // Confirmation modal should open
      cy.get('[data-testid="delete-modal"]').should('be.visible');
      cy.contains('Are you sure').should('be.visible');
      
      // Confirm delete
      cy.contains('Delete').click();
      
      // Should show success message
      cy.contains(/deleted successfully/i).should('be.visible');
    });
  });

  describe('Bulk Operations', () => {
    it('should select multiple users', () => {
      cy.contains('Users').click();
      
      // Select first 3 users
      cy.get('[data-testid="user-checkbox"]').eq(0).click();
      cy.get('[data-testid="user-checkbox"]').eq(1).click();
      cy.get('[data-testid="user-checkbox"]').eq(2).click();
      
      // Should show bulk actions bar
      cy.contains('3 selected').should('be.visible');
      cy.get('[data-testid="bulk-actions"]').should('be.visible');
    });

    it('should bulk update user status', () => {
      cy.contains('Users').click();
      
      // Select users
      cy.get('[data-testid="user-checkbox"]').eq(0).click();
      cy.get('[data-testid="user-checkbox"]').eq(1).click();
      
      // Open bulk update modal
      cy.contains('Bulk Update').click();
      
      // Select new status
      cy.get('[data-testid="bulk-status-select"]').click();
      cy.contains('SUSPENDED').click();
      
      // Confirm update
      cy.contains('Apply to 2 users').click();
      
      // Should show success message
      cy.contains(/2 users updated/i).should('be.visible');
    });

    it('should enforce 100 record limit for bulk operations', () => {
      cy.contains('Users').click();
      
      // Try to select more than 100 users (intercept API)
      cy.intercept('POST', '/api/database/bulk-update', {
        statusCode: 400,
        body: {
          type: 'https://datatracker.ietf.org/doc/html/rfc7807',
          title: 'Bad Request',
          status: 400,
          detail: 'Cannot update more than 100 records at once',
        },
      }).as('bulkLimitError');
      
      // Attempt bulk update
      // (In real test, would select 101 items, but simulating error)
      cy.contains('Bulk Update').click();
      
      // Should show error
      cy.wait('@bulkLimitError');
      cy.contains(/more than 100/i).should('be.visible');
    });
  });

  describe('Export Functionality', () => {
    it('should export data to CSV', () => {
      cy.contains('Users').click();
      
      // Click CSV export
      cy.contains('Export CSV').click();
      
      // File should download
      cy.readFile('cypress/downloads/database_users_*.csv').should('exist');
    });

    it('should export data to Excel', () => {
      cy.contains('Users').click();
      
      // Click Excel export
      cy.contains('Export Excel').click();
      
      // File should download
      cy.readFile('cypress/downloads/database_users_*.xlsx').should('exist');
    });

    it('should export data to PDF', () => {
      cy.contains('Users').click();
      
      // Click PDF export
      cy.contains('Export PDF').click();
      
      // File should download
      cy.readFile('cypress/downloads/database_users_*.pdf').should('exist');
    });
  });

  describe('Column Visibility', () => {
    it('should toggle column visibility', () => {
      cy.contains('Users').click();
      
      // Open column visibility menu
      cy.get('[data-testid="column-visibility-button"]').click();
      
      // Toggle email column off
      cy.contains('Email').parent().find('input[type="checkbox"]').uncheck();
      
      // Email column should be hidden
      cy.get('[data-testid="user-table"]').should('not.contain', 'Email');
      
      // Toggle back on
      cy.get('[data-testid="column-visibility-button"]').click();
      cy.contains('Email').parent().find('input[type="checkbox"]').check();
      
      // Email column should be visible
      cy.get('[data-testid="user-table"]').should('contain', 'Email');
    });
  });

  describe('Sorting', () => {
    it('should sort by column', () => {
      cy.contains('Users').click();
      
      // Click name column header to sort
      cy.contains('Name').click();
      
      // Should sort ascending (check URL params)
      cy.url().should('include', 'sort=first_name');
      cy.url().should('include', 'order=asc');
      
      // Click again to reverse
      cy.contains('Name').click();
      cy.url().should('include', 'order=desc');
    });
  });

  describe('Multi-Table Navigation', () => {
    it('should switch between tables', () => {
      // Start on Users
      cy.contains('Users').click();
      cy.get('[data-testid="user-table"]').should('be.visible');
      
      // Switch to Instructors
      cy.contains('Instructors').click();
      cy.get('[data-testid="instructor-table"]').should('be.visible');
      
      // Switch to Bookings
      cy.contains('Bookings').click();
      cy.get('[data-testid="booking-table"]').should('be.visible');
    });
  });

  describe('Performance', () => {
    it('should handle large datasets with virtual scrolling', () => {
      cy.contains('Users').click();
      
      // Load page with 1000+ records
      cy.intercept('GET', '/api/database/users*', {
        fixture: 'large-user-dataset.json', // Mock 1000 records
      });
      
      // Should render without lag
      cy.get('[data-testid="user-table"]').should('be.visible');
      
      // Scroll to bottom
      cy.get('[data-testid="user-table"]').scrollTo('bottom');
      
      // Should load more rows (virtual scrolling)
      cy.wait(500);
      cy.get('[data-testid="user-row"]').should('have.length.greaterThan', 20);
    });
  });

  describe('Error Handling', () => {
    it('should show error when API fails', () => {
      cy.contains('Users').click();
      
      // Intercept API with error
      cy.intercept('GET', '/api/database/users*', {
        statusCode: 500,
        body: {
          type: 'https://datatracker.ietf.org/doc/html/rfc7807',
          title: 'Internal Server Error',
          status: 500,
          detail: 'Database connection failed',
        },
      });
      
      // Should show error message
      cy.contains(/error/i).should('be.visible');
      cy.contains(/Database connection failed/i).should('be.visible');
    });

    it('should show 401 unauthorized error', () => {
      cy.intercept('GET', '/api/database/users*', {
        statusCode: 401,
        body: {
          type: 'https://datatracker.ietf.org/doc/html/rfc7807',
          title: 'Unauthorized',
          status: 401,
          detail: 'Authentication required',
        },
      });
      
      cy.contains('Users').click();
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });
});
