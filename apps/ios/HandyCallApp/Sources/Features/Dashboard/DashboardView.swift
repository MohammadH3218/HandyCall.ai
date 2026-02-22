import SwiftUI

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var stats: DashboardStats?
    @Published var isLoading = false
    @Published var error: String?

    func load(using api: APIClient) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            stats = try await api.getDashboardStats()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct DashboardView: View {
    @EnvironmentObject private var container: AppContainer
    @EnvironmentObject private var sessionStore: SessionStore
    @StateObject private var viewModel = DashboardViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    hero

                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 180)
                    } else if let error = viewModel.error {
                        Text(error)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    } else if let stats = viewModel.stats {
                        statGrid(stats: stats)
                    }
                }
                .padding(16)
            }
            .navigationTitle("Dashboard")
            .task {
                await viewModel.load(using: container.apiClient)
            }
            .refreshable {
                await viewModel.load(using: container.apiClient)
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(sessionStore.company?.companyName ?? "HandyCall")
                .font(.title3.weight(.bold))
            Text("Your operations pulse: calls, leads, bookings, and usage.")
                .font(.subheadline)
                .opacity(0.92)
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(HandyCallTheme.topGradient, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func statGrid(stats: DashboardStats) -> some View {
        let items: [(String, Int)] = [
            ("Today's Calls", stats.today.totalCalls),
            ("Today's Leads", stats.today.newLeads),
            ("Appointments", stats.today.appointmentsScheduled),
            ("Open Questions", stats.pendingQuestions)
        ]

        return LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ForEach(items, id: \.0) { item in
                VStack(alignment: .leading, spacing: 6) {
                    Text(item.0)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Text("\(item.1)")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(HandyCallTheme.slate)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
    }
}
