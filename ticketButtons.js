const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ChannelType,
  AttachmentBuilder,
  MessageFlags,
} = require('discord.js');
const { createTicket, getTicket, updateTicket } = require('./db');
const { embedColor, modRoleName, ticketCategoryName, ticketLogChannelName } = require('./config');

module.exports = {
  id: 'ticket_button_handler',
  async execute(interaction, client) {
    const { customId, guild, member } = interaction;

    // Mapping customIds to titles and channel prefixes
    const ticketTypes = {
      'ticket_invites': { name: 'Invites Rewards', prefix: 'invites' },
      'ticket_chest': { name: 'Chest Rewards', prefix: 'chest' },
      'ticket_giveaway': { name: 'Giveaway Rewards', prefix: 'giveaway' },
      'ticket_general': { name: 'General Support', prefix: 'ticket' },
      'create_ticket': { name: 'General Support', prefix: 'ticket' }, 
      'ticket_open': { name: 'General Support', prefix: 'ticket' }     
    };

    // ── Open Ticket (Handles all 4 types dynamically) ──────────────────────────
    if (Object.keys(ticketTypes).includes(customId)) {
      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

      const chosenType = ticketTypes[customId];
      const cleanUsername = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '-');

      // Check if user already has an open ticket of this type
      const existing = guild.channels.cache.find(
        ch => ch.name.startsWith(`${chosenType.prefix}-`) && 
              (ch.name.includes(cleanUsername) || (ch.topic && ch.topic.includes(member.id)))
      );

      if (existing) {
        return interaction.editReply({
          content: `❌ You already have an open ticket for **${chosenType.name}**: ${existing}`,
        });
      }

      // Find category
      const category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory &&
             c.name.toLowerCase() === ticketCategoryName.toLowerCase()
      );

      const modRole = guild.roles.cache.find(r => r.name === modRoleName);

      // Create channel with clean custom type prefix
      const channelName = `${chosenType.prefix}-${cleanUsername}`.slice(0, 20);
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category || null,
        topic: `${chosenType.name} Ticket opened by <@${member.id}> (${member.id})`,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          ...(modRole
            ? [{
                id: modRole.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.AttachFiles,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.ManageMessages,
                ],
              }]
            : []),
        ],
      });

      const ticketData = createTicket(guild.id, ticketChannel.id, member.id, chosenType.name);

      const welcomeEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`🎟️ ${chosenType.name} Ticket #${ticketData.id}`)
        .setDescription(
          `Hello ${member}! Welcome to your support ticket regarding **${chosenType.name}**.\n\n` +
          `**Please upload image proof** related to your issue below.\n` +
          `Once received, a moderator will review and assist you.\n\n` +
          `> 📎 Attach your screenshot or image directly to a message in this channel.`
        )
        .setFooter({ text: 'This channel is private — only you and staff can see it.' })
        .setTimestamp();

      const closeBtn = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

      const claimBtn = new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Claim Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🙋');

      const row = new ActionRowBuilder().addComponents(claimBtn, closeBtn);

      await ticketChannel.send({
        content: `${member} — Please read the instructions below.`,
        embeds: [welcomeEmbed],
        components: [row],
      });

      await interaction.editReply({
        content: `✅ Your ticket has been created: ${ticketChannel}`,
      });
      return;
    }

    // ── Claim Ticket ─────────────────────────────────────────────────────────
    if (customId === 'ticket_claim') {
      const modRole = guild.roles.cache.find(r => r.name === modRoleName);
      const isMod = modRole && member.roles.cache.has(modRole.id);
      if (!isMod) {
        return interaction.reply({ content: '❌ Only moderators can claim tickets.', flags: [MessageFlags.Ephemeral] });
      }

      const ticket = getTicket(guild.id, interaction.channel.id);
      if (!ticket) return interaction.reply({ content: '❌ This is not a ticket channel.', flags: [MessageFlags.Ephemeral] });
      if (ticket.claimedBy) {
        return interaction.reply({ content: `❌ Already claimed by <@${ticket.claimedBy}>.`, flags: [MessageFlags.Ephemeral] });
      }

      updateTicket(guild.id, interaction.channel.id, {
        status: 'claimed',
        claimedBy: member.id,
      });

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setDescription(`🙋 This ticket has been **claimed** by ${member}.`);

      const closeBtn = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');
      const updatedRow = new ActionRowBuilder().addComponents(closeBtn);

      await interaction.update({ components: [updatedRow] }).catch(() => {});
      await interaction.channel.send({ embeds: [embed] });
    }

    // ── Close Ticket ─────────────────────────────────────────────────────────
    if (customId === 'ticket_close') {
      const ticket = getTicket(guild.id, interaction.channel.id);
      if (!ticket) return interaction.reply({ content: '❌ This is not a ticket channel.', flags: [MessageFlags.Ephemeral] });

      const modRole = guild.roles.cache.find(r => r.name === modRoleName);
      const isMod = modRole && member.roles.cache.has(modRole.id);
      const isOwner = member.id === ticket.userId;

      if (!isMod && !isOwner) {
        return interaction.reply({ content: '❌ Only the ticket owner or moderators can close this ticket.', flags: [MessageFlags.Ephemeral] });
      }

      await interaction.deferReply();

      updateTicket(guild.id, interaction.channel.id, {
        status: 'closed',
        closedAt: Date.now(),
      });

      const messages = await interaction.channel.messages.fetch({ limit: 50 });
      const transcript = messages
        .reverse()
        .map(m => `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}${m.attachments.size ? ` [${m.attachments.size} attachment(s)]` : ''}`)
        .join('\n');

      const logChannel = guild.channels.cache.find(c => c.name === ticketLogChannelName);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`🔒 Ticket #${ticket.id} Closed`)
          .addFields(
            { name: 'Opened by', value: `<@${ticket.userId}>`, inline: true },
            { name: 'Closed by', value: `${member}`, inline: true },
            { name: 'Claimed by', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Unclaimed', inline: true },
            { name: 'Ticket Type', value: `${ticket.type || 'General'}`, inline: true },
            { name: 'Proof images', value: `${ticket.proofImages?.length || 0}`, inline: true },
            { name: 'Status', value: ticket.proofImages?.length ? '✅ Proof provided' : '❌ No proof', inline: true },
          )
          .setTimestamp();

        if (ticket.proofImages?.length) {
          logEmbed.setImage(ticket.proofImages[0]);
        }

        const transcriptFile = new AttachmentBuilder(
          Buffer.from(transcript, 'utf-8'),
          { name: `ticket-${ticket.id}-transcript.txt` }
        );

        await logChannel.send({ embeds: [logEmbed], files: [transcriptFile] });
      }

      await interaction.editReply({ content: '🔒 Ticket is being closed...' });

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }
};
