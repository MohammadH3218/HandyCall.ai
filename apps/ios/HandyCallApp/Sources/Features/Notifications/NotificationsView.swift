import SwiftUI

@MainActor
final class NotificationsViewModel: ObservableObject {
    @Published var notifications: [NotificationItem] = []
    @Published var unreadCount: Int = 0
    @Published var isLoading = false
    @Published var error: String?
    @Published var showUnreadOnly = false

    func load(using api: APIClient) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            async let feed = api.getNotifications(limit: 100, unreadOnly: showUnreadOnly)
            async let unread = api.getUnreadNotificationCount()
            let (items, count) = try await (feed, unread)
            notifications = items
            unreadCount = count
        } catch {
            self.error = error.localizedDescription
        }
    }

    func markRead(_ item: NotificationItem, using api: APIClient) async {
        guard item.isRead == false else { return }
        do {
            try await api.markNotificationRead(notificationID: item.notificationID)
            await load(using: api)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func markAllRead(using api: APIClient) async {
        do {
            try await api.markAllNotificationsRead()
            await load(using: api)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct NotificationsView: View {
    @EnvironmentObject private var container: AppContainer
    @StateObject private var viewModel = NotificationsViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                filterHeader
                content
            }
            .navigationTitle("Notifications")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Read all") {
                        Task { await viewModel.markAllRead(using: container.apiClient) }
                    }
                    .disabled(viewModel.unreadCount == 0)
                }
            }
            .task {
                await viewModel.load(using: container.apiClient)
            }
            .refreshable {
                await viewModel.load(using: container.apiClient)
            }
        }
    }

    private var filterHeader: some View {
        HStack(spacing: 12) {
            Text("Unread: \(viewModel.unreadCount)")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(HandyCallTheme.slate)
            Spacer()
            Toggle("Unread only", isOn: $viewModel.showUnreadOnly)
                .labelsHidden()
                .onChange(of: viewModel.showUnreadOnly) {
                    Task { await viewModel.load(using: container.apiClient) }
                }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.white)
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading {
            Spacer()
            ProgressView()
            Spacer()
        } else if let error = viewModel.error {
            Spacer()
            Text(error).foregroundStyle(.red)
            Spacer()
        } else if viewModel.notifications.isEmpty {
            Spacer()
            Text("No notifications yet.")
                .foregroundStyle(.secondary)
            Spacer()
        } else {
            List(viewModel.notifications) { item in
                Button {
                    Task { await viewModel.markRead(item, using: container.apiClient) }
                } label: {
                    HStack(alignment: .top, spacing: 10) {
                        Circle()
                            .fill(item.isRead ? Color.clear : HandyCallTheme.emerald)
                            .frame(width: 8, height: 8)
                            .padding(.top, 6)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.title)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.primary)
                            Text(item.body)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            Text(Date(timeIntervalSince1970: item.createdAt / 1000), format: .dateTime.month().day().hour().minute())
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .buttonStyle(.plain)
            }
            .listStyle(.plain)
        }
    }
}
