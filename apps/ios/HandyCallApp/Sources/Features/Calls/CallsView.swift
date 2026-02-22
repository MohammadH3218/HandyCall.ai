import SwiftUI

@MainActor
final class CallsViewModel: ObservableObject {
    @Published var calls: [CallItem] = []
    @Published var isLoading = false
    @Published var error: String?

    func load(using api: APIClient) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            calls = try await api.getCalls(limit: 100)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct CallsView: View {
    @EnvironmentObject private var container: AppContainer
    @StateObject private var viewModel = CallsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if let error = viewModel.error {
                    Text(error).foregroundStyle(.red)
                } else if viewModel.calls.isEmpty {
                    ContentUnavailableView(
                        "No calls yet",
                        systemImage: "phone.down.waves.left.and.right",
                        description: Text("Completed and in-progress calls will appear here.")
                    )
                } else {
                    List(viewModel.calls) { call in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(call.callerName ?? call.callerPhone ?? "Unknown")
                                .font(.headline)
                            Text(call.status ?? "Completed")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            if let created = call.createdAt {
                                Text(created.replacingOccurrences(of: "T", with: " ").replacingOccurrences(of: "Z", with: ""))
                                    .font(.footnote)
                                    .foregroundStyle(HandyCallTheme.emeraldDark)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Calls")
            .task {
                await viewModel.load(using: container.apiClient)
            }
            .refreshable {
                await viewModel.load(using: container.apiClient)
            }
        }
    }
}
