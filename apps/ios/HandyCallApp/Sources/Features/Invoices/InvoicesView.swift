import SwiftUI

@MainActor
final class InvoicesViewModel: ObservableObject {
    @Published var invoices: [Invoice] = []
    @Published var stats: InvoiceStats?
    @Published var isLoading = false
    @Published var error: String?
    @Published var actionError: String?

    func load(using api: APIClient) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            async let fetchedInvoices = api.getInvoices()
            async let fetchedStats = api.getInvoiceStats()
            invoices = try await fetchedInvoices
            stats = try await fetchedStats
        } catch {
            self.error = error.localizedDescription
        }
    }

    func send(invoiceID: String, using api: APIClient) async {
        actionError = nil
        do {
            try await api.sendInvoice(invoiceID: invoiceID)
            await load(using: api)
        } catch {
            actionError = error.localizedDescription
        }
    }

    func markPaid(invoiceID: String, using api: APIClient) async {
        actionError = nil
        do {
            try await api.markInvoicePaid(invoiceID: invoiceID)
            await load(using: api)
        } catch {
            actionError = error.localizedDescription
        }
    }
}

struct InvoicesView: View {
    @EnvironmentObject private var container: AppContainer
    @StateObject private var viewModel = InvoicesViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading {
                ScrollView {
                    VStack(spacing: 12) {
                        statsSkeletonRow
                        ForEach(0..<4, id: \.self) { _ in
                            InvoiceCardSkeleton()
                        }
                    }
                    .padding(HandyCallTheme.Spacing.screenPadding)
                }
            } else if let error = viewModel.error {
                HCErrorCard(text: error)
                    .padding(HandyCallTheme.Spacing.screenPadding)
            } else {
                ScrollView {
                    VStack(spacing: HandyCallTheme.Spacing.lg) {
                        if let stats = viewModel.stats {
                            statsRow(stats)
                        }

                        if let actionError = viewModel.actionError {
                            HCErrorCard(text: actionError)
                        }

                        if viewModel.invoices.isEmpty {
                            HCEmptyState(
                                icon: "doc.text",
                                title: "No invoices yet",
                                message: "Invoices you create will appear here."
                            )
                        } else {
                            LazyVStack(spacing: 12) {
                                ForEach(Array(viewModel.invoices.enumerated()), id: \.element.id) { index, invoice in
                                    InvoiceCard(invoice: invoice, viewModel: viewModel)
                                        .staggeredAppearance(index: index)
                                }
                            }
                        }
                    }
                    .padding(HandyCallTheme.Spacing.screenPadding)
                }
            }
        }
        .background(HandyCallTheme.pageBackground.ignoresSafeArea())
        .navigationTitle("Invoices")
        .task { await viewModel.load(using: container.apiClient) }
        .refreshable { await viewModel.load(using: container.apiClient) }
    }

    // MARK: - Stats

    private func statsRow(_ stats: InvoiceStats) -> some View {
        HStack(spacing: 10) {
            StatMini(
                icon: "dollarsign.circle.fill",
                iconColor: HandyCallTheme.emeraldFixed,
                label: "Revenue",
                value: currency(stats.totalRevenueCents)
            )
            StatMini(
                icon: "clock.badge.exclamationmark.fill",
                iconColor: HandyCallTheme.warning,
                label: "Outstanding",
                value: currency(stats.outstandingAmountCents)
            )
            StatMini(
                icon: "doc.text.fill",
                iconColor: HandyCallTheme.info,
                label: "Total",
                value: "\(stats.totalInvoices)"
            )
        }
    }

    private var statsSkeletonRow: some View {
        HStack(spacing: 10) {
            ForEach(0..<3, id: \.self) { _ in
                StatCardSkeleton()
            }
        }
    }

    private func currency(_ cents: Int) -> String {
        (Double(cents) / 100).formatted(.currency(code: "USD"))
    }
}

// MARK: - Stat Mini Card

private struct StatMini: View {
    let icon: String
    let iconColor: Color
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(iconColor)
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(HandyCallTheme.slate)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(HandyCallTheme.Spacing.md)
        .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.md, style: .continuous))
        .cardShadow()
    }
}

// MARK: - Invoice Card

private struct InvoiceCard: View {
    let invoice: Invoice
    @ObservedObject var viewModel: InvoicesViewModel
    @EnvironmentObject private var container: AppContainer

    var body: some View {
        VStack(alignment: .leading, spacing: HandyCallTheme.Spacing.md) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(invoice.invoiceNumber)
                        .font(HandyCallTheme.Typography.caption)
                        .foregroundStyle(.secondary)
                    Text(invoice.customerName)
                        .font(HandyCallTheme.Typography.headline)
                        .foregroundStyle(HandyCallTheme.slate)
                }

                Spacer()

                StatusBadge(text: invoice.status)
            }

            // Line items summary
            if !invoice.lineItems.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(invoice.lineItems.prefix(3)) { item in
                        HStack {
                            Text(item.description)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                            Spacer()
                            Text((Double(item.unitPriceCents * item.quantity) / 100).formatted(.currency(code: "USD")))
                                .font(.caption.weight(.medium))
                                .foregroundStyle(HandyCallTheme.slate)
                        }
                    }
                    if invoice.lineItems.count > 3 {
                        Text("+\(invoice.lineItems.count - 3) more")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }

            Divider()

            // Footer
            HStack {
                if let date = invoice.createdDate {
                    Text(date.formatted(.dateTime.month(.abbreviated).day()))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }

                Spacer()

                Text(invoice.totalFormatted)
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(HandyCallTheme.emeraldFixed)
            }

            // Actions
            if invoice.status.uppercased() == "DRAFT" {
                Button {
                    Task { await viewModel.send(invoiceID: invoice.invoiceID, using: container.apiClient) }
                } label: {
                    Label("Send Invoice", systemImage: "paperplane.fill")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .foregroundStyle(.white)
                        .background(HandyCallTheme.emeraldFixed.gradient, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.sm, style: .continuous))
                }
            } else if ["SENT", "VIEWED", "OVERDUE"].contains(invoice.status.uppercased()) {
                Button {
                    Task { await viewModel.markPaid(invoiceID: invoice.invoiceID, using: container.apiClient) }
                } label: {
                    Label("Mark as Paid", systemImage: "checkmark.circle.fill")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .foregroundStyle(HandyCallTheme.emeraldFixed)
                        .background(HandyCallTheme.emeraldLight, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.sm, style: .continuous))
                }
            }
        }
        .padding(HandyCallTheme.Spacing.cardPadding)
        .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.card, style: .continuous))
        .cardShadow()
    }
}

// MARK: - Skeleton

private struct InvoiceCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    ShimmerView(width: 70, height: 11)
                    ShimmerView(width: 140, height: 14)
                }
                Spacer()
                ShimmerView(width: 60, height: 22, cornerRadius: 11)
            }
            ShimmerView(height: 12)
            Divider()
            HStack {
                ShimmerView(width: 60, height: 11)
                Spacer()
                ShimmerView(width: 80, height: 20)
            }
        }
        .padding(HandyCallTheme.Spacing.cardPadding)
        .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.card, style: .continuous))
    }
}
