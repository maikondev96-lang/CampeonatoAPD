# Concerns

## Technical Debt
- **Monolithic Components**: `AdminMatchDetail.tsx` and others are quite large (~600 lines) and handle multiple responsibilities (data fetching, business logic, complex UI).
- **Inline Styling**: Extensive use of inline `style` objects makes the code harder to read and maintain. Styles should be moved to CSS files or a CSS-in-JS solution.
- **Direct Supabase Usage**: Pages are tightly coupled to the Supabase client. Lack of a service/data-access layer complicates testing and potential backend migrations.

## Logic Risks
- **Hardcoded Tournament Logic**: The logic for propagating winners from semifinals to finals is hardcoded within component methods (`handleFinalize` in `AdminMatchDetail.tsx`). This is a critical point of failure.
- **Reactive State Complexity**: Scores and standings are often calculated on-the-fly using `useEffect` hooks. As the number of event types grows, this logic becomes harder to track.

## Missing Features
- **Automated Testing**: Zero coverage for critical business logic (scoring, standings, knockout propagation).
- **Error Boundaries**: Lack of global error handling for Supabase failures or runtime errors.
- **Loading States**: While some pages have loaders, the consistency could be improved across the whole app.
