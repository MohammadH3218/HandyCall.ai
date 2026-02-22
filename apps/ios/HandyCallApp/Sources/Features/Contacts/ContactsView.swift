import SwiftUI

@MainActor
final class ContactsViewModel: ObservableObject {
    @Published var contacts: [ContactItem] = []
    @Published var isLoading = false
    @Published var error: String?

    func load(using api: APIClient) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            contacts = try await api.getContacts(limit: 100)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct ContactsView: View {
    @EnvironmentObject private var container: AppContainer
    @StateObject private var viewModel = ContactsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if let error = viewModel.error {
                    Text(error).foregroundStyle(.red)
                } else {
                    List(viewModel.contacts) { contact in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(contact.displayName)
                                .font(.headline)
                            Text(contact.phoneNumber ?? "")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            if let status = contact.leadStatus {
                                Text(status.capitalized)
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(HandyCallTheme.emeraldDark)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Leads")
            .task {
                await viewModel.load(using: container.apiClient)
            }
            .refreshable {
                await viewModel.load(using: container.apiClient)
            }
        }
    }
}
